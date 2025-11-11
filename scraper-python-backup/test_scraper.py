"""
Test scraper implementation
テスト用の簡単なスクレイパー実装
"""

import logging
from typing import Dict, List, Any
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from scraper_base import BaseScraper

logger = logging.getLogger(__name__)

class TestScraper(BaseScraper):
    """テスト用スクレイパー"""
    
    def extract_tail_data(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        テスト用の猫データ抽出
        実際のサイト構造がわからないため、サンプルデータを生成
        """
        logger.info("Extracting test tail data")
        
        # テスト用サンプルデータ
        test_data = [
            {
                'external_id': f'test_{self.municipality_id}_001',
                'animal_type': 'cat',
                'name': 'テスト猫1号',
                'breed': 'ミックス',
                'age_estimate': '成猫（2-3歳推定）',
                'gender': 'female',
                'color': '三毛（茶・黒・白）',
                'size': 'medium',
                'health_status': '健康状態良好',
                'personality': '人懐っこい性格',
                'special_needs': None,
                'images': [f'{base_url}/images/test_cat_1.jpg'],
                'protection_date': (datetime.now() - timedelta(days=10)).date(),
                'deadline_date': (datetime.now() + timedelta(days=7)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': f'{base_url}/cat/test_001'
            },
            {
                'external_id': f'test_{self.municipality_id}_002',
                'animal_type': 'cat',
                'name': 'テスト猫2号',
                'breed': 'ミックス',
                'age_estimate': '子猫（生後3ヶ月）',
                'gender': 'male',
                'color': '黒',
                'size': 'small',
                'health_status': '健康状態良好、ワクチン接種済み',
                'personality': '元気いっぱい',
                'special_needs': None,
                'images': [f'{base_url}/images/test_cat_2.jpg'],
                'protection_date': (datetime.now() - timedelta(days=5)).date(),
                'deadline_date': (datetime.now() + timedelta(days=3)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': f'{base_url}/cat/test_002'
            }
        ]
        
        logger.info(f"Generated {len(test_data)} test tail records")
        return test_data

class SimpleScraper(BaseScraper):
    """
    シンプルなHTMLスクレイパー
    一般的なHTMLパターンに対応
    """
    
    def extract_tail_data(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        一般的なHTMLから猫データを抽出
        """
        logger.info("Extracting tail data from HTML")
        
        tails = []
        
        # 一般的なパターンを試行
        # 1. テーブル形式
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for i, row in enumerate(rows[1:], 1):  # ヘッダー行をスキップ
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 3:  # 最低限の情報があることを確認
                    tail_data = self._extract_from_table_row(cells, base_url, i)
                    if tail_data:
                        tails.append(tail_data)
        
        # 2. リスト形式
        if not tails:
            lists = soup.find_all(['ul', 'ol'])
            for ul in lists:
                items = ul.find_all('li')
                for i, item in enumerate(items, 1):
                    tail_data = self._extract_from_list_item(item, base_url, i)
                    if tail_data:
                        tails.append(tail_data)
        
        # 3. div形式（カード型レイアウト）
        if not tails:
            # 猫らしいキーワードを含むdivを探す
            cat_divs = soup.find_all('div', text=lambda text: text and any(
                keyword in text for keyword in ['猫', 'ネコ', 'ねこ', '保護', '里親']
            ))
            
            for i, div in enumerate(cat_divs[:10], 1):  # 最大10件
                tail_data = self._extract_from_div(div, base_url, i)
                if tail_data:
                    tails.append(tail_data)
        
        logger.info(f"Extracted {len(tails)} tail records from HTML")
        return tails
    
    def _extract_from_table_row(self, cells, base_url: str, index: int) -> Dict[str, Any]:
        """テーブル行から猫データを抽出"""
        try:
            # セルのテキストを取得
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            
            # 基本的な情報を推測
            name = cell_texts[0] if cell_texts[0] else f'保護猫{index}号'
            gender_text = ' '.join(cell_texts)
            
            return {
                'external_id': f'scraped_{self.municipality_id}_{index:03d}',
                'animal_type': 'cat',
                'name': name,
                'breed': 'ミックス',
                'age_estimate': self.normalize_age(' '.join(cell_texts)),
                'gender': self.normalize_gender(gender_text),
                'color': None,
                'size': 'medium',
                'health_status': ' '.join(cell_texts[1:3]) if len(cell_texts) > 2 else None,
                'personality': None,
                'special_needs': None,
                'images': self.extract_images(BeautifulSoup(str(cells[0]), 'lxml'), base_url),
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': (datetime.now() + timedelta(days=14)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url
            }
        except Exception as e:
            logger.warning(f"Failed to extract from table row: {e}")
            return None
    
    def _extract_from_list_item(self, item, base_url: str, index: int) -> Dict[str, Any]:
        """リストアイテムから猫データを抽出"""
        try:
            text = item.get_text(strip=True)
            if not text or len(text) < 5:
                return None
            
            return {
                'external_id': f'scraped_{self.municipality_id}_{index:03d}',
                'animal_type': 'cat',
                'name': f'保護猫{index}号',
                'breed': 'ミックス',
                'age_estimate': self.normalize_age(text),
                'gender': self.normalize_gender(text),
                'color': None,
                'size': 'medium',
                'health_status': text[:100] if len(text) > 10 else None,
                'personality': None,
                'special_needs': None,
                'images': self.extract_images(BeautifulSoup(str(item), 'lxml'), base_url),
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': (datetime.now() + timedelta(days=14)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url
            }
        except Exception as e:
            logger.warning(f"Failed to extract from list item: {e}")
            return None
    
    def _extract_from_div(self, div, base_url: str, index: int) -> Dict[str, Any]:
        """divから猫データを抽出"""
        try:
            text = div.get_text(strip=True)
            if not text or len(text) < 5:
                return None
            
            return {
                'external_id': f'scraped_{self.municipality_id}_{index:03d}',
                'animal_type': 'cat',
                'name': f'保護猫{index}号',
                'breed': 'ミックス',
                'age_estimate': self.normalize_age(text),
                'gender': self.normalize_gender(text),
                'color': None,
                'size': 'medium',
                'health_status': text[:100] if len(text) > 10 else None,
                'personality': None,
                'special_needs': None,
                'images': self.extract_images(div, base_url),
                'protection_date': (datetime.now() - timedelta(days=7)).date(),
                'deadline_date': (datetime.now() + timedelta(days=14)).date(),
                'status': 'available',
                'transfer_decided': False,
                'source_url': base_url
            }
        except Exception as e:
            logger.warning(f"Failed to extract from div: {e}")
            return None