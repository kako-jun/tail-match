"""
Base scraper class for Tail Match
各自治体サイト用スクレイパーの基底クラス
"""

import requests
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
from config import config
from database import db
from html_sampler import html_sampler
from health_monitor import health_monitor

logger = logging.getLogger(__name__)

class ScraperResult:
    """スクレイピング結果を格納するクラス"""
    
    def __init__(self):
        self.tails_found = 0
        self.tails_added = 0
        self.tails_updated = 0
        self.tails_removed = 0
        self.errors = []
        self.success = True
        self.execution_time_ms = 0
        self.start_time = None
        self.end_time = None
    
    def start_timer(self):
        """実行時間の計測開始"""
        self.start_time = datetime.now()
    
    def end_timer(self):
        """実行時間の計測終了"""
        self.end_time = datetime.now()
        if self.start_time:
            delta = self.end_time - self.start_time
            self.execution_time_ms = int(delta.total_seconds() * 1000)
    
    def add_error(self, error: str):
        """エラーを追加"""
        self.errors.append(error)
        self.success = False
    
    def to_log_data(self, municipality_id: int) -> Dict[str, Any]:
        """ログデータ形式に変換"""
        return {
            'municipality_id': municipality_id,
            'started_at': self.start_time,
            'completed_at': self.end_time,
            'status': 'success' if self.success else 'error',
            'tails_found': self.tails_found,
            'tails_added': self.tails_added,
            'tails_updated': self.tails_updated,
            'tails_removed': self.tails_removed,
            'error_message': '; '.join(self.errors) if self.errors else None,
            'execution_time_ms': self.execution_time_ms
        }

class BaseScraper:
    """基底スクレイパークラス"""
    
    def __init__(self, municipality_id: int):
        self.municipality_id = municipality_id
        self.municipality = None
        self.session = requests.Session()
        self.session.headers.update(config.get_scraping_headers())
        
        # プロキシ設定（環境変数から取得）
        import os
        proxies = {}
        https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
        http_proxy = os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
        
        if https_proxy:
            proxies['https'] = https_proxy
            logger.info(f"HTTPS プロキシ設定: {https_proxy}")
        if http_proxy:
            proxies['http'] = http_proxy
            logger.info(f"HTTP プロキシ設定: {http_proxy}")
        
        if proxies:
            self.session.proxies.update(proxies)
        else:
            logger.info("プロキシ設定なし")
        
        # 自治体情報を取得
        self.municipality = db.get_municipality_by_id(municipality_id)
        if not self.municipality:
            raise ValueError(f"Municipality {municipality_id} not found")
        
        logger.info(f"Initialized scraper for {self.municipality['name']}")
    
    def check_robots_txt(self, base_url: str) -> bool:
        """robots.txtをチェック"""
        try:
            rp = RobotFileParser()
            robots_url = urljoin(base_url, '/robots.txt')
            rp.set_url(robots_url)
            rp.read()
            
            user_agent = config.get_scraping_headers()['User-Agent']
            can_fetch = rp.can_fetch(user_agent, base_url)
            
            if not can_fetch:
                logger.warning(f"robots.txt disallows access to {base_url}")
            
            return can_fetch
        except Exception as e:
            logger.warning(f"Could not check robots.txt for {base_url}: {e}")
            return True  # robots.txtが読めない場合は許可とみなす
    
    def polite_request(self, url: str, **kwargs) -> Optional[requests.Response]:
        """礼儀正しいHTTPリクエスト"""
        try:
            # robots.txtチェック
            if not self.check_robots_txt(url):
                logger.error(f"robots.txt disallows access to {url}")
                return None
            
            # リクエスト間隔を保つ
            time.sleep(config.SCRAPING_INTERVAL_SECONDS)
            
            # リクエスト実行
            response = self.session.get(
                url,
                timeout=config.REQUEST_TIMEOUT,
                **kwargs
            )
            response.raise_for_status()
            
            logger.debug(f"Successfully fetched {url}")
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {url}: {e}")
            return None
    
    def parse_html(self, html: str) -> BeautifulSoup:
        """HTMLを解析"""
        return BeautifulSoup(html, 'lxml')
    
    def extract_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """画像URLを抽出（基本実装）"""
        images = []
        img_tags = soup.find_all('img')
        
        for img in img_tags:
            src = img.get('src')
            if src:
                # 相対URLを絶対URLに変換
                absolute_url = urljoin(base_url, src)
                # 猫の画像らしいものをフィルタリング（簡易版）
                if any(keyword in src.lower() for keyword in ['cat', 'neko', '猫', 'animal', 'pet']):
                    images.append(absolute_url)
        
        return images[:5]  # 最大5枚まで
    
    def normalize_gender(self, gender_text: str) -> Optional[str]:
        """性別テキストを正規化"""
        if not gender_text:
            return None
        
        gender_text = gender_text.lower().strip()
        
        if any(keyword in gender_text for keyword in ['オス', 'おす', 'male', '♂', '雄']):
            return 'male'
        elif any(keyword in gender_text for keyword in ['メス', 'めす', 'female', '♀', '雌']):
            return 'female'
        else:
            return 'unknown'
    
    def normalize_age(self, age_text: str) -> Optional[str]:
        """年齢テキストを正規化"""
        if not age_text:
            return None
        
        age_text = age_text.strip()
        
        # 子猫の判定
        if any(keyword in age_text for keyword in ['子猫', 'こねこ', '仔猫', '生後', 'ヶ月', 'か月']):
            return '子猫'
        # シニア猫の判定
        elif any(keyword in age_text for keyword in ['シニア', '高齢', '老', '歳以上']):
            return 'シニア猫'
        # 成猫の判定
        elif any(keyword in age_text for keyword in ['成猫', '成', '歳']):
            return '成猫'
        
        return age_text
    
    def parse_deadline_date(self, date_text: str) -> Optional[datetime]:
        """期限日テキストを解析"""
        if not date_text:
            return None
        
        try:
            # 日本語の日付パターンを試行
            import dateparser
            
            # 相対日付の処理
            settings = {
                'LANGUAGES': ['ja'],
                'DATE_ORDER': 'YMD',
                'RELATIVE_BASE': datetime.now()
            }
            
            parsed_date = dateparser.parse(date_text, settings=settings)
            
            if parsed_date:
                return parsed_date.date()
                
        except Exception as e:
            logger.warning(f"Failed to parse date '{date_text}': {e}")
        
        return None
    
    def extract_tail_data(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        猫データを抽出（各自治体でオーバーライド）
        
        Args:
            soup: BeautifulSoupオブジェクト
            base_url: ベースURL
            
        Returns:
            猫データのリスト
        """
        raise NotImplementedError("Subclasses must implement extract_tail_data method")
    
    def scrape(self) -> ScraperResult:
        """メインスクレイピング処理（ヘルスモニタリング付き）"""
        result = ScraperResult()
        result.start_timer()
        
        # ハートビート更新
        health_monitor.update_heartbeat('starting', f"Starting scrape for {self.municipality['name']}")
        
        logger.info(f"Starting scrape for {self.municipality['name']}")
        
        try:
            # 自治体のWebサイトURL
            website_url = self.municipality.get('website_url')
            if not website_url:
                result.add_error("No website URL configured")
                return result
            
            # ページを取得
            response = self.polite_request(website_url)
            if not response:
                result.add_error(f"Failed to fetch {website_url}")
                return result
            
            # HTMLを解析
            soup = self.parse_html(response.text)
            
            # 猫データを抽出
            tail_data_list = self.extract_tail_data(soup, website_url)
            result.tails_found = len(tail_data_list)
            
            # HTMLサンプルを保存（重要：デグレ防止のため）
            extraction_successful = len(tail_data_list) > 0
            html_sampler.save_html_sample(
                url=website_url,
                html_content=response.text,
                municipality_id=self.municipality_id,
                cats_found=len(tail_data_list),
                extraction_successful=extraction_successful
            )
            
            # データベースに保存
            current_external_ids = []
            for tail_data in tail_data_list:
                tail_data['municipality_id'] = self.municipality_id
                
                try:
                    tail_id = db.upsert_tail(tail_data)
                    if tail_id:
                        current_external_ids.append(tail_data.get('external_id'))
                        # 新規追加か更新かの判定は簡易的
                        result.tails_added += 1
                        
                except Exception as e:
                    result.add_error(f"Failed to save tail data: {e}")
            
            # 見つからなかった猫を削除状態にマーク
            removed_count = db.mark_tails_as_removed(self.municipality_id, current_external_ids)
            result.tails_removed = removed_count
            
            logger.info(
                f"Scraping completed for {self.municipality['name']}: "
                f"{result.tails_found} found, {result.tails_added} added, {result.tails_removed} removed"
            )
            
            # 成功時のハートビート更新
            health_monitor.update_heartbeat('completed', 
                f"Scraping completed: {result.tails_found} found, {result.tails_added} added")
            
        except Exception as e:
            result.add_error(f"Scraping failed: {e}")
            logger.error(f"Scraping failed for {self.municipality['name']}: {e}")
            
            # エラー時のハートビート更新
            health_monitor.update_heartbeat('error', f"Scraping failed: {str(e)[:100]}")
            
            # 緊急事態の場合は緊急通知
            if "connection" in str(e).lower() or "timeout" in str(e).lower():
                health_monitor.emergency_notification(
                    f"Connection issue during scraping {self.municipality['name']}: {e}")
        
        finally:
            result.end_timer()
            
            # 結果をログに記録
            try:
                db.log_scraping_result(result.to_log_data(self.municipality_id))
            except Exception as e:
                logger.error(f"Failed to log scraping result: {e}")
                health_monitor.emergency_notification(f"Failed to log scraping result: {e}")
        
        return result