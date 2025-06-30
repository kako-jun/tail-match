"""
Ishikawa Prefecture Scraper for Tail Match
石川県専用スクレイパー実装
"""

import logging
from typing import Dict, List, Any
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from scraper_base import BaseScraper
from local_extractor import local_extractor

logger = logging.getLogger(__name__)

class IshikawaScraper(BaseScraper):
    """石川県動物愛護センター用スクレイパー"""
    
    def __init__(self, municipality_id: int):
        super().__init__(municipality_id)
        
        # 石川県の動物愛護施設URL
        self.known_urls = {
            'ishikawa_aigo': 'https://aigo-ishikawa.jp/petadoption_list/',
            'kanazawa_city': 'https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/index.html'
        }
        
        logger.info(f"Initialized Ishikawa scraper for municipality {municipality_id}")

    def extract_tail_data(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        石川県サイトから猫データを抽出（安全重視・複数手法併用）
        """
        logger.info(f"Extracting tail data from Ishikawa site: {base_url}")
        
        all_cats = []
        
        # サイト別の特殊処理
        if 'aigo-ishikawa.jp' in base_url:
            specific_cats = self._extract_from_aigo_ishikawa(soup, base_url)
            all_cats.extend(specific_cats)
            logger.info(f"Ishikawa specific extraction: {len(specific_cats)} cats")
        elif 'city.kanazawa.lg.jp' in base_url:
            specific_cats = self._extract_from_kanazawa_city(soup, base_url)
            all_cats.extend(specific_cats)
            logger.info(f"Kanazawa specific extraction: {len(specific_cats)} cats")
        
        # 汎用抽出も必ず実行（見逃し防止）
        generic_cats = local_extractor.extract_from_html(soup, base_url)
        all_cats.extend(generic_cats)
        logger.info(f"Generic extraction: {len(generic_cats)} cats")
        
        # 重複除去
        unique_cats = self._deduplicate_extracted_cats(all_cats)
        
        logger.info(f"Final result: {len(unique_cats)} unique cats from {len(all_cats)} total extractions")
        
        # 抽出結果の妥当性チェック
        if len(all_cats) > 0 and len(unique_cats) == 0:
            logger.error("⚠️ CRITICAL: All cats filtered out during deduplication - possible data loss!")
        
        return unique_cats

    def _extract_from_aigo_ishikawa(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """いしかわ動物愛護センター専用抽出"""
        logger.info("Using Ishikawa Animal Protection Center specific extraction")
        
        cats = []
        
        # .data_boxes .data_box.cat-card を検索
        cat_cards = soup.select('.data_boxes .data_box.cat-card')
        
        if not cat_cards:
            # フォールバック: 汎用的なカード検索
            cat_cards = soup.select('.data_box')
            cat_cards = [card for card in cat_cards if 'cat' in card.get('class', [])]
        
        for i, card in enumerate(cat_cards, 1):
            cat_data = self._extract_cat_from_aigo_card(card, base_url, i)
            if cat_data:
                cats.append(cat_data)
        
        # カードが見つからない場合は汎用抽出を試行
        if not cats:
            logger.info("No cat cards found, trying generic extraction")
            cats = local_extractor.extract_from_html(soup, base_url)
        
        logger.info(f"Extracted {len(cats)} cats from Ishikawa Animal Protection Center")
        return cats

    def _extract_cat_from_aigo_card(self, card, base_url: str, index: int) -> Dict[str, Any]:
        """いしかわ動物愛護センターのカードから猫データを抽出"""
        try:
            # dl/dt/dd 構造から情報を抽出
            cat_info = {}
            
            dl_elements = card.find_all('dl')
            for dl in dl_elements:
                dts = dl.find_all('dt')
                dds = dl.find_all('dd')
                
                for dt, dd in zip(dts, dds):
                    key = dt.get_text(strip=True)
                    value = dd.get_text(strip=True)
                    cat_info[key] = value
            
            # 画像を抽出
            images = []
            img_tags = card.find_all('img')
            for img in img_tags:
                src = img.get('src')
                if src:
                    from urllib.parse import urljoin
                    images.append(urljoin(base_url, src))
            
            # 基本情報の構築
            name = cat_info.get('名前', cat_info.get('なまえ', f'いしかわ保護猫{index:03d}号'))
            
            # 性別の正規化
            gender_text = cat_info.get('性別', '')
            gender = self.normalize_gender(gender_text)
            
            # 年齢の正規化
            age_text = cat_info.get('年齢', '')
            age_estimate = self.normalize_age(age_text)
            
            # 毛色
            color = cat_info.get('毛色', cat_info.get('色', ''))
            
            # 品種
            breed = cat_info.get('品種', cat_info.get('種類', 'ミックス'))
            
            # 期限日の推定（通常は1ヶ月程度）
            deadline_date = (datetime.now() + timedelta(days=30)).date()
            
            return {
                'external_id': f'ishikawa_aigo_{index:03d}',
                'animal_type': 'cat',
                'name': name,
                'breed': breed,
                'age_estimate': age_estimate,
                'gender': gender,
                'color': color,
                'size': 'medium',
                'health_status': cat_info.get('健康状態', None),
                'personality': cat_info.get('性格', None),
                'special_needs': cat_info.get('備考', cat_info.get('その他', None)),
                'images': images[:3],  # 最大3枚
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': deadline_date,
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url
            }
            
        except Exception as e:
            logger.error(f"Failed to extract cat data from Aigo card: {e}")
            return None

    def _extract_from_kanazawa_city(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """金沢市動物愛護管理センター専用抽出"""
        logger.info("Using Kanazawa City specific extraction")
        
        cats = []
        
        # まず標準的なテーブル構造を検索
        tables = soup.find_all('table')
        
        for table in tables:
            table_text = table.get_text().lower()
            if any(keyword in table_text for keyword in ['猫', 'ネコ', 'ねこ']):
                rows = table.find_all('tr')
                
                for i, row in enumerate(rows[1:], 1):  # ヘッダー行をスキップ
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        cat_data = self._extract_cat_from_kanazawa_row(cells, base_url, i)
                        if cat_data:
                            cats.append(cat_data)
        
        # テーブルが見つからない場合は汎用抽出
        if not cats:
            logger.info("No tables found, trying generic extraction")
            cats = local_extractor.extract_from_html(soup, base_url)
        
        logger.info(f"Extracted {len(cats)} cats from Kanazawa City")
        return cats

    def _extract_cat_from_kanazawa_row(self, cells, base_url: str, index: int) -> Dict[str, Any]:
        """金沢市のテーブル行から猫データを抽出"""
        try:
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            combined_text = ' '.join(cell_texts)
            
            # 基本情報
            name = cell_texts[0] if cell_texts[0] else f'金沢保護猫{index:03d}号'
            
            # 画像を検索
            images = []
            for cell in cells:
                img_tags = cell.find_all('img')
                for img in img_tags:
                    src = img.get('src')
                    if src:
                        from urllib.parse import urljoin
                        images.append(urljoin(base_url, src))
            
            return {
                'external_id': f'kanazawa_city_{index:03d}',
                'animal_type': 'cat',
                'name': name,
                'breed': 'ミックス',
                'age_estimate': self.normalize_age(combined_text),
                'gender': self.normalize_gender(combined_text),
                'color': None,
                'size': 'medium',
                'health_status': ' '.join(cell_texts[1:3]) if len(cell_texts) > 2 else None,
                'personality': None,
                'special_needs': None,
                'images': images,
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': (datetime.now() + timedelta(days=21)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url
            }
            
        except Exception as e:
            logger.error(f"Failed to extract cat data from Kanazawa row: {e}")
            return None

class IshikawaAigoScraper(IshikawaScraper):
    """いしかわ動物愛護センター専用スクレイパー"""
    
    def __init__(self, municipality_id: int):
        super().__init__(municipality_id)
        # URLを愛護センターに固定
        if self.municipality:
            self.municipality['website_url'] = self.known_urls['ishikawa_aigo']

class KanazawaCityScraper(IshikawaScraper):
    """金沢市動物愛護管理センター専用スクレイパー"""
    
    def __init__(self, municipality_id: int):
        super().__init__(municipality_id)
        # URLを金沢市に固定
        if self.municipality:
            self.municipality['website_url'] = self.known_urls['kanazawa_city']

    def _deduplicate_extracted_cats(self, cats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """抽出された猫データの重複除去（安全重視）"""
        if not cats:
            return []
        
        unique_cats = []
        seen_combinations = set()
        
        for cat in cats:
            # より寛容な重複判定（少しでも違いがあれば別の猫として扱う）
            name = cat.get('name', '').lower().strip()
            color = cat.get('color', '').lower().strip()
            age = cat.get('age_estimate', '').lower().strip()
            gender = cat.get('gender', '').lower().strip()
            
            # 組み合わせを作成（空の場合はランダムな値を使用）
            import time
            combination = (name or f'unnamed_{int(time.time() * 1000000) % 1000}',
                          color or 'unknown_color',
                          age or 'unknown_age',
                          gender or 'unknown_gender')
            
            # 完全に同じ組み合わせの場合のみ重複とみなす
            if combination not in seen_combinations:
                unique_cats.append(cat)
                seen_combinations.add(combination)
            else:
                logger.info(f"Duplicate cat filtered: {name} - {color} - {age} - {gender}")
        
        return unique_cats