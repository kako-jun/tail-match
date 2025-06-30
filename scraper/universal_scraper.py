"""
Universal Scraper for All Municipalities
全国自治体対応汎用スクレイパー
"""

import logging
from typing import Dict, List, Any
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from scraper_base import BaseScraper
from local_extractor import local_extractor
from playwright.sync_api import sync_playwright
import time

logger = logging.getLogger(__name__)

class UniversalScraper(BaseScraper):
    """全国の自治体サイト対応汎用スクレイパー"""
    
    def __init__(self, municipality_id: int):
        super().__init__(municipality_id)
        
        # 自治体特有のパターンを動的学習するための設定
        self.learned_patterns = {}
        self.extraction_strategies = [
            'standard_extraction',
            'aggressive_extraction', 
            'broken_html_extraction',
            'manual_content_extraction'
        ]
        
        logger.info(f"Initialized universal scraper for municipality {municipality_id}")

    def extract_tail_data(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        汎用猫データ抽出（静的→動的の2段構え）
        """
        logger.info(f"Starting universal extraction for: {base_url}")
        
        all_cats = []
        strategy_results = {}
        
        # 戦略1: 標準的な構造化抽出
        standard_cats = self._standard_extraction(soup, base_url)
        all_cats.extend(standard_cats)
        strategy_results['standard'] = len(standard_cats)
        logger.info(f"Standard extraction: {len(standard_cats)} cats")
        
        # 戦略2: 積極的抽出（キーワードベース）
        aggressive_cats = self._aggressive_extraction(soup, base_url)
        all_cats.extend(aggressive_cats)
        strategy_results['aggressive'] = len(aggressive_cats)
        logger.info(f"Aggressive extraction: {len(aggressive_cats)} cats")
        
        # 戦略3: 破損HTML対応抽出
        broken_cats = self._broken_html_extraction(soup, base_url)
        all_cats.extend(broken_cats)
        strategy_results['broken_html'] = len(broken_cats)
        logger.info(f"Broken HTML extraction: {len(broken_cats)} cats")
        
        # 戦略4: 手動コンテンツ抽出（最後の手段）
        manual_cats = self._manual_content_extraction(soup, base_url)
        all_cats.extend(manual_cats)
        strategy_results['manual'] = len(manual_cats)
        logger.info(f"Manual content extraction: {len(manual_cats)} cats")
        
        # 戦略5: JavaScript検出・動的処理 🆕
        js_detected = self._detect_javascript_content(soup)
        if js_detected and len(all_cats) == 0:
            logger.info("🔍 JavaScript content detected, no cats found - attempting dynamic extraction")
            dynamic_cats = self._dynamic_extraction(base_url)
            all_cats.extend(dynamic_cats)
            strategy_results['dynamic'] = len(dynamic_cats)
            logger.info(f"Dynamic extraction: {len(dynamic_cats)} cats")
        elif js_detected and len(all_cats) > 0:
            logger.info(f"🔍 JavaScript detected but {len(all_cats)} cats found - skipping dynamic extraction")
            strategy_results['dynamic'] = 0
        
        # 重複除去
        unique_cats = self._deduplicate_universal_cats(all_cats)
        
        # 結果の分析とロギング
        total_found = len(all_cats)
        unique_found = len(unique_cats)
        
        logger.info(f"Universal extraction completed:")
        logger.info(f"  Total extractions: {total_found}")
        logger.info(f"  Unique cats: {unique_found}")
        logger.info(f"  Strategy breakdown: {strategy_results}")
        
        # 戦略の有効性を学習
        self._learn_effective_strategies(strategy_results, base_url)
        
        # 安全性チェック
        if total_found > 0 and unique_found == 0:
            logger.error("🚨 CRITICAL: All cats filtered out during deduplication!")
            logger.error("    This could mean cats are being missed - manual review needed")
        
        if unique_found == 0 and any(strategy_results.values()):
            logger.warning("⚠️ No cats found despite positive strategy results - possible false negatives")
        
        return unique_cats

    def _standard_extraction(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """標準的な構造化抽出"""
        return local_extractor.extract_from_html(soup, base_url)

    def _aggressive_extraction(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """積極的キーワードベース抽出"""
        cats = []
        
        # より広範囲なキーワード検索
        extended_keywords = [
            '猫', 'ネコ', 'ねこ', 'cat', '子猫', 'こねこ', '仔猫',
            '保護', '収容', '里親', '譲渡', '飼い主', '動物', 'ペット'
        ]
        
        for keyword in extended_keywords:
            elements = soup.find_all(text=lambda text: text and keyword in text)
            for text_node in elements[:5]:  # キーワードごとに最大5件
                parent = text_node.parent
                if parent and self._looks_like_cat_info(parent.get_text()):
                    cat_data = self._extract_from_suspicious_element(parent, base_url, keyword)
                    if cat_data:
                        cats.append(cat_data)
        
        return cats

    def _broken_html_extraction(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """破損HTML対応抽出"""
        cats = []
        
        # HTMLが正しく閉じられていない場合の処理
        html_str = str(soup)
        
        # よくある手動編集の痕跡を検出
        manual_patterns = [
            r'猫.*?(?=猫|\Z)',  # "猫"から次の"猫"まで、または文末まで
            r'名前.*?(?=名前|\Z)',  # "名前"から次の"名前"まで、または文末まで
            r'性別.*?年齢.*?色.*?',  # 性別、年齢、色が連続するパターン
        ]
        
        for pattern in manual_patterns:
            import re
            matches = re.findall(pattern, html_str, re.DOTALL | re.IGNORECASE)
            for i, match in enumerate(matches[:10], 1):
                if len(match) > 10 and len(match) < 500:  # 適度な長さ
                    cat_data = self._extract_from_text_block(match, base_url, i)
                    if cat_data:
                        cats.append(cat_data)
        
        return cats

    def _manual_content_extraction(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """手動コンテンツ抽出（最後の手段）"""
        cats = []
        
        # ページ全体のテキストを解析
        all_text = soup.get_text()
        
        # 改行や句読点で分割して、各ブロックを評価
        text_blocks = []
        for separator in ['\n\n', '。', '．', '※', '★', '●']:
            if separator in all_text:
                text_blocks.extend(all_text.split(separator))
        
        # 重複除去
        unique_blocks = list(set([block.strip() for block in text_blocks if len(block.strip()) > 20]))
        
        for i, block in enumerate(unique_blocks[:20], 1):  # 最大20ブロック
            if self._looks_like_cat_info(block):
                cat_data = self._extract_from_text_block(block, base_url, i + 5000)
                if cat_data:
                    cat_data['external_id'] = f'manual_extraction_{i:03d}'
                    cats.append(cat_data)
        
        return cats

    def _looks_like_cat_info(self, text: str) -> bool:
        """テキストが猫情報らしいかを判定"""
        text_lower = text.lower()
        
        # 猫関連キーワードの必須チェック
        has_cat_keyword = any(keyword in text_lower for keyword in ['猫', 'ネコ', 'ねこ', 'cat'])
        if not has_cat_keyword:
            return False
        
        # 詳細情報キーワードのスコアリング
        detail_keywords = ['性別', '年齢', '色', '毛色', 'オス', 'メス', '歳', 'ヶ月', '白', '黒', '茶']
        detail_score = sum(1 for keyword in detail_keywords if keyword in text)
        
        # 期限や状態に関するキーワード
        status_keywords = ['期限', '里親', '譲渡', '保護', '収容', '募集']
        status_score = sum(1 for keyword in status_keywords if keyword in text)
        
        # 最低2つの詳細情報または1つの状態情報が必要
        return detail_score >= 2 or status_score >= 1

    def _extract_from_suspicious_element(self, element, base_url: str, keyword: str) -> Dict[str, Any]:
        """疑わしい要素から猫データを抽出"""
        try:
            text = element.get_text()
            
            # 基本的な情報を抽出
            name = self._extract_name_from_text(text)
            gender = local_extractor._extract_gender(text)
            age = local_extractor._extract_age(text)
            color = local_extractor._extract_color(text)
            
            return {
                'external_id': f'suspicious_{keyword}_{hash(text) % 1000:03d}',
                'animal_type': 'cat',
                'name': name or f'保護猫_{keyword}',
                'breed': 'ミックス',
                'age_estimate': age,
                'gender': gender,
                'color': color,
                'size': 'medium',
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': (datetime.now() + timedelta(days=21)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url,
                'extraction_method': f'aggressive_{keyword}'
            }
        except Exception as e:
            logger.debug(f"Failed to extract from suspicious element: {e}")
            return None

    def _extract_from_text_block(self, text: str, base_url: str, index: int) -> Dict[str, Any]:
        """テキストブロックから猫データを抽出"""
        try:
            name = self._extract_name_from_text(text)
            gender = local_extractor._extract_gender(text)
            age = local_extractor._extract_age(text)
            color = local_extractor._extract_color(text)
            
            return {
                'external_id': f'text_block_{index:03d}',
                'animal_type': 'cat',
                'name': name or f'保護猫{index:03d}号',
                'breed': 'ミックス',
                'age_estimate': age,
                'gender': gender,
                'color': color,
                'size': 'medium',
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': (datetime.now() + timedelta(days=21)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url,
                'extraction_method': 'text_block'
            }
        except Exception as e:
            logger.debug(f"Failed to extract from text block: {e}")
            return None

    def _extract_name_from_text(self, text: str) -> str:
        """テキストから名前を抽出"""
        # 名前パターンの検索
        name_patterns = [
            r'名前[：:\s]*([^\s\n。、]+)',
            r'なまえ[：:\s]*([^\s\n。、]+)',
            r'猫の名前[：:\s]*([^\s\n。、]+)',
        ]
        
        for pattern in name_patterns:
            import re
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        return None

    def _deduplicate_universal_cats(self, cats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """汎用猫データの重複除去（非常に保守的）"""
        if not cats:
            return []
        
        unique_cats = []
        seen_fingerprints = set()
        
        for cat in cats:
            # より寛容なフィンガープリント作成
            name = (cat.get('name', '') or '').lower().strip()
            gender = (cat.get('gender', '') or '').lower()
            age = (cat.get('age_estimate', '') or '').lower()
            color = (cat.get('color', '') or '').lower()
            
            # 非常に特徴的な組み合わせのみを重複とみなす
            fingerprint = f"{name}_{gender}_{age}_{color}"
            
            # 空の情報が多い場合は重複判定を緩和
            empty_fields = sum(1 for field in [name, gender, age, color] if not field)
            if empty_fields >= 3:
                # 情報が少なすぎる場合は、より厳密な条件で重複判定
                fingerprint = f"{name}_{hash(str(cat)) % 10000}"
            
            if fingerprint not in seen_fingerprints:
                unique_cats.append(cat)
                seen_fingerprints.add(fingerprint)
            else:
                logger.debug(f"Duplicate cat filtered: {fingerprint}")
        
        return unique_cats

    def _learn_effective_strategies(self, strategy_results: Dict[str, int], base_url: str):
        """有効な戦略を学習（将来的な改善のため）"""
        domain = base_url.split('/')[2] if '//' in base_url else base_url
        
        if domain not in self.learned_patterns:
            self.learned_patterns[domain] = {}
        
        # 各戦略の有効性を記録
        for strategy, count in strategy_results.items():
            if strategy not in self.learned_patterns[domain]:
                self.learned_patterns[domain][strategy] = []
            
            self.learned_patterns[domain][strategy].append(count)
            
            # 最新10回の結果のみ保持
            if len(self.learned_patterns[domain][strategy]) > 10:
                self.learned_patterns[domain][strategy] = self.learned_patterns[domain][strategy][-10:]
        
        logger.debug(f"Learning updated for {domain}: {self.learned_patterns[domain]}")

    def _detect_javascript_content(self, soup: BeautifulSoup) -> bool:
        """JavaScript動的コンテンツを検出"""
        # 1. 外部JSファイルの存在確認
        external_scripts = soup.find_all('script', src=True)
        if len(external_scripts) > 2:  # 基本的なライブラリ以上
            return True
        
        # 2. AJAX/Fetch の痕跡
        all_scripts = soup.find_all('script')
        ajax_keywords = ['ajax', 'fetch', 'XMLHttpRequest', '$.get', '$.post', 'axios']
        
        for script in all_scripts:
            script_text = str(script).lower()
            if any(keyword.lower() in script_text for keyword in ajax_keywords):
                return True
        
        # 3. 空のコンテナ（JSで埋められる可能性）
        import re
        full_html = str(soup).lower()
        api_patterns = [r'/api/', r'\.json', r'/data/', r'ajax']
        
        if any(re.search(pattern, full_html) for pattern in api_patterns):
            return True
        
        # 4. 動物関連の空要素
        empty_divs = soup.find_all('div', class_=True)
        for div in empty_divs:
            if not div.get_text(strip=True) and len(div.find_all()) == 0:
                classes = ' '.join(div.get('class', []))
                if any(word in classes.lower() for word in ['pet', 'animal', 'cat', 'list', 'data']):
                    return True
        
        return False

    def _dynamic_extraction(self, base_url: str) -> List[Dict[str, Any]]:
        """Playwrightを使った動的サイト処理（プロキシ対応）"""
        try:
            # Playwrightでページを読み込み
            from playwright.sync_api import sync_playwright
            import os
            
            with sync_playwright() as p:
                # プロキシ設定を環境変数から取得
                https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
                http_proxy = os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
                
                browser_args = {"headless": True}
                
                # プロキシが設定されている場合は使用
                if https_proxy:
                    browser_args["proxy"] = {"server": https_proxy}
                    logger.info(f"プロキシ使用: {https_proxy}")
                elif http_proxy:
                    browser_args["proxy"] = {"server": http_proxy}
                    logger.info(f"プロキシ使用: {http_proxy}")
                else:
                    logger.info("プロキシなしで動作")
                
                browser = p.chromium.launch(**browser_args)
                page = browser.new_page()
                
                # ページ読み込み
                page.goto(base_url, wait_until='networkidle', timeout=30000)
                
                # 動的コンテンツの読み込み待機
                page.wait_for_timeout(5000)  # 5秒待機
                
                # レンダリング後のHTMLを取得
                html_content = page.content()
                browser.close()
                
                logger.info(f"動的HTML取得完了: {len(html_content)} chars")
                
                # 新しいSoupで再解析
                from bs4 import BeautifulSoup
                dynamic_soup = BeautifulSoup(html_content, 'lxml')
                
                # 標準的な抽出を再実行
                return self._standard_extraction(dynamic_soup, base_url)
                
        except ImportError:
            logger.error("Playwright not installed - dynamic extraction skipped")
            return []
        except Exception as e:
            logger.error(f"Dynamic extraction failed: {e}")
            return []