"""
Local Pattern Matching Extractor for Tail Match
ローカルパターンマッチング抽出システム（外部API不使用）
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from bs4 import BeautifulSoup, Tag
import dateparser

logger = logging.getLogger(__name__)

class LocalExtractor:
    """汎用ローカルパターンマッチング抽出クラス（全国自治体対応）"""
    
    def __init__(self):
        # 猫関連キーワードパターン（全国の自治体でよく使われる表現）
        self.cat_keywords = {
            'general': ['猫', 'ネコ', 'ねこ', 'cat', '子猫', 'こねこ', '仔猫', '小猫'],
            'breed': ['ミックス', 'mix', '雑種', '日本猫', 'ペルシャ', 'シャム', 'アメショ', 'ロシアンブルー', '交雑', '和猫'],
            'color': ['三毛', 'みけ', '白', '黒', '茶', '茶白', 'サビ', 'キジ', 'キジ白', '灰', 'ベージュ', '茶トラ', '白黒', 'しろ', 'くろ'],
            'gender': ['オス', 'おす', '雄', 'メス', 'めす', '雌', '♂', '♀', 'male', 'female', '男の子', '女の子'],
            'age': ['子猫', '成猫', 'シニア', '高齢', '生後', 'ヶ月', 'か月', '歳', '才', 'ヵ月', '老猫', '幼猫'],
            'status': ['募集', '里親', '譲渡', '保護', '収容', '期限', '処分', '引取り', '収容中', '譲渡可能', '飼い主募集']
        }
        
        # 共通HTML構造パターン（全国の自治体サイトで頻出）
        self.common_selectors = {
            'table_patterns': [
                'table',
                '.table',
                '.data-table', 
                '.animal-table',
                '.cat-table',
                '.adoption-table',
                'table[class*="cat"]',
                'table[class*="animal"]',
                'table[id*="cat"]',
                'table[id*="animal"]'
            ],
            'card_patterns': [
                '.cat-card', '.animal-card', '.pet-card', '.adoption-card',
                '.data_box', '.data-box', '.animal-info', '.cat-info',
                'div[class*="cat"]', 'div[class*="animal"]', 'div[class*="pet"]',
                '.card', '.info-card', '.profile-card'
            ],
            'list_patterns': [
                '.cat-list', '.animal-list', '.adoption-list',
                'ul[class*="cat"]', 'ol[class*="animal"]',
                '.list', '.data-list'
            ]
        }
        
        # 自治体職員がよく使う不規則なHTMLパターン
        self.irregular_patterns = {
            'manual_editing_signs': [
                '<br>', '<BR>', '&nbsp;', 
                '</p><p>', '</div><div>',
                '　', '  ', '\n\n'  # 手動改行や全角スペース
            ],
            'broken_html_signs': [
                '<p><p>', '</div></p>', '<td><div>',
                'style=', 'align=', 'bgcolor='  # インライン属性（古い手法）
            ]
        }
        
        # 日付パターン
        self.date_patterns = [
            r'(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?',
            r'(\d{1,2})[月/-](\d{1,2})[日]?',
            r'期限.*?(\d{1,2})[月/-](\d{1,2})[日]?',
            r'まで.*?(\d{1,2})[月/-](\d{1,2})[日]?',
        ]
        
        # 年齢パターン
        self.age_patterns = [
            r'生後(\d+)[ヶか]?月',
            r'(\d+)歳',
            r'(\d+)才',
            r'(\d+)[ヶか]月',
            r'子猫',
            r'成猫',
            r'シニア',
            r'高齢'
        ]
        
        # 性別パターン
        self.gender_patterns = [
            r'オス|雄|♂|male',
            r'メス|雌|♀|female'
        ]

    def extract_from_html(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """HTMLから猫情報を抽出（保守的・安全重視）"""
        logger.info("Starting conservative local extraction from HTML")
        
        all_extracted_cats = []
        
        # 1. テーブル形式の抽出を並行実行
        table_cats = self._extract_from_tables(soup, base_url)
        if table_cats:
            all_extracted_cats.extend(table_cats)
            logger.info(f"Table extraction found {len(table_cats)} cats")
        
        # 2. カード形式の抽出を並行実行
        card_cats = self._extract_from_cards(soup, base_url)
        if card_cats:
            all_extracted_cats.extend(card_cats)
            logger.info(f"Card extraction found {len(card_cats)} cats")
        
        # 3. リスト形式の抽出を並行実行
        list_cats = self._extract_from_lists(soup, base_url)
        if list_cats:
            all_extracted_cats.extend(list_cats)
            logger.info(f"List extraction found {len(list_cats)} cats")
        
        # 4. 汎用的なテキスト抽出を並行実行
        text_cats = self._extract_from_text(soup, base_url)
        if text_cats:
            all_extracted_cats.extend(text_cats)
            logger.info(f"Text extraction found {len(text_cats)} cats")
        
        # 5. 積極的なキーワード検索（見逃し防止）
        aggressive_cats = self._aggressive_keyword_search(soup, base_url)
        if aggressive_cats:
            all_extracted_cats.extend(aggressive_cats)
            logger.info(f"Aggressive keyword search found {len(aggressive_cats)} cats")
        
        # 重複除去（external_idまたは類似度で判定）
        unique_cats = self._deduplicate_cats(all_extracted_cats)
        
        logger.info(f"Conservative extraction completed: {len(unique_cats)} unique cats from {len(all_extracted_cats)} total extractions")
        
        # 見逃しがないかの追加チェック
        if len(all_extracted_cats) > 0 and len(unique_cats) == 0:
            logger.warning("⚠️ CRITICAL: All extractions filtered out - possible false negative!")
        
        return unique_cats

    def _extract_from_tables(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """テーブル形式から抽出（共通セレクタ使用）"""
        cats = []
        
        # 共通のテーブルパターンを全て試行
        for selector in self.common_selectors['table_patterns']:
            try:
                tables = soup.select(selector)
                for table in tables:
                    # 猫関連のテーブルかチェック
                    table_text = table.get_text().lower()
                    if not any(keyword in table_text for keyword in self.cat_keywords['general']):
                        continue
                    
                    cats.extend(self._extract_from_single_table(table, base_url))
            except Exception as e:
                logger.debug(f"Table selector '{selector}' failed: {e}")
                continue
        
        # 破損したテーブルの救済処理
        cats.extend(self._extract_from_broken_tables(soup, base_url))
        
        return cats
    
    def _extract_from_single_table(self, table: Tag, base_url: str) -> List[Dict[str, Any]]:
        """単一テーブルからの抽出"""
        cats = []
        rows = table.find_all('tr')
        headers = []
        
        # ヘッダー行を検出
        if rows:
            first_row = rows[0]
            headers = [th.get_text(strip=True) for th in first_row.find_all(['th', 'td'])]
        
        # データ行を処理
        for i, row in enumerate(rows[1:] if headers else rows, 1):
            cells = row.find_all(['td', 'th'])
            if len(cells) < 1:  # 最低1セルあれば処理
                continue
            
            cat_data = self._extract_cat_from_cells(cells, headers, base_url, i)
            if cat_data:
                cats.append(cat_data)
        
        return cats
    
    def _extract_from_broken_tables(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """破損したテーブル（手動HTML編集）からの抽出"""
        cats = []
        
        # <tr>タグがないが<td>タグがある場合
        orphan_tds = soup.find_all('td')
        current_row = []
        
        for td in orphan_tds:
            text = td.get_text().strip()
            if any(keyword in text.lower() for keyword in self.cat_keywords['general']):
                current_row.append(td)
                
                # 猫情報が十分揃ったら処理
                if len(current_row) >= 2:
                    cat_data = self._extract_cat_from_cells(current_row, [], base_url, len(cats) + 1)
                    if cat_data:
                        cats.append(cat_data)
                    current_row = []
        
        return cats

    def _extract_from_cards(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """カード形式から抽出（共通パターン使用）"""
        cats = []
        
        # 共通のカードパターンを全て試行
        for selector in self.common_selectors['card_patterns']:
            try:
                cards = soup.select(selector)
                for i, card in enumerate(cards, 1):
                    if self._contains_cat_keywords(card.get_text()):
                        cat_data = self._extract_cat_from_card(card, base_url, i)
                        if cat_data:
                            cats.append(cat_data)
            except Exception as e:
                logger.debug(f"Card selector '{selector}' failed: {e}")
                continue
        
        # 手動編集された不規則なカード構造の救済
        cats.extend(self._extract_from_irregular_cards(soup, base_url))
        
        return cats
    
    def _extract_from_irregular_cards(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """不規則なカード構造（手動HTML編集）からの抽出"""
        cats = []
        
        # <br>区切りで情報が並んでいる場合（よくある手動編集パターン）
        br_separated_blocks = []
        for element in soup.find_all(['p', 'div']):
            if '<br>' in str(element) or '<BR>' in str(element):
                text = element.get_text()
                if any(keyword in text.lower() for keyword in self.cat_keywords['general']):
                    br_separated_blocks.append(element)
        
        for i, block in enumerate(br_separated_blocks, 1):
            cat_data = self._extract_cat_from_element(block, base_url, i + 2000)  # 番号を大きくして区別
            if cat_data:
                cat_data['external_id'] = f'irregular_card_{i:03d}'
                cats.append(cat_data)
        
        # 全角スペース区切りの情報（Excel貼り付けパターン）
        space_separated_elements = soup.find_all(text=lambda text: text and '　' in text)
        for i, text_node in enumerate(space_separated_elements[:10], 1):
            if any(keyword in text_node.lower() for keyword in self.cat_keywords['general']):
                parent = text_node.parent
                cat_data = self._extract_cat_from_element(parent, base_url, i + 3000)
                if cat_data:
                    cat_data['external_id'] = f'space_separated_{i:03d}'
                    cats.append(cat_data)
        
        return cats

    def _extract_from_lists(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """リスト形式から抽出（共通パターン＋破損HTML対応）"""
        cats = []
        
        # 共通のリストパターンを試行
        for selector in self.common_selectors['list_patterns']:
            try:
                lists = soup.select(selector)
                for ul in lists:
                    list_text = ul.get_text().lower()
                    if not any(keyword in list_text for keyword in self.cat_keywords['general']):
                        continue
                    
                    items = ul.find_all('li')
                    for i, item in enumerate(items, 1):
                        if self._contains_cat_keywords(item.get_text()):
                            cat_data = self._extract_cat_from_element(item, base_url, i)
                            if cat_data:
                                cats.append(cat_data)
            except Exception as e:
                logger.debug(f"List selector '{selector}' failed: {e}")
                continue
        
        # 番号付きリスト（手動作成）の検出
        cats.extend(self._extract_from_numbered_lists(soup, base_url))
        
        return cats
    
    def _extract_from_numbered_lists(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """手動番号付きリスト（1. 2. 3. や ① ② ③ など）からの抽出"""
        cats = []
        
        # 数字とピリオドのパターン
        numbered_patterns = [
            r'(\d+)\.\s*',  # 1. 2. 3.
            r'(\d+)\)\s*',  # 1) 2) 3)
            r'[①②③④⑤⑥⑦⑧⑨⑩]\s*',  # 丸数字
            r'[一二三四五六七八九十]\s*[．。]\s*'  # 漢数字
        ]
        
        all_text = soup.get_text()
        for pattern in numbered_patterns:
            matches = re.split(pattern, all_text)
            for i, section in enumerate(matches[1:], 1):  # 最初の要素は空または無関係
                if any(keyword in section.lower() for keyword in self.cat_keywords['general']):
                    # このセクションに猫情報がありそう
                    # 対応するHTML要素を見つける
                    for element in soup.find_all(['p', 'div', 'span']):
                        if section[:50] in element.get_text():  # 最初の50文字でマッチング
                            cat_data = self._extract_cat_from_element(element, base_url, i + 4000)
                            if cat_data:
                                cat_data['external_id'] = f'numbered_list_{i:03d}'
                                cats.append(cat_data)
                            break
        
        return cats

    def _extract_from_text(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """汎用的なテキストから抽出"""
        cats = []
        
        # 猫関連のテキストを含む要素を検索
        elements = soup.find_all(text=lambda text: text and any(
            keyword in text.lower() for keyword in self.cat_keywords['general']
        ))
        
        processed_elements = set()
        
        for i, text_node in enumerate(elements[:10], 1):  # 最大10件
            parent = text_node.parent
            if parent in processed_elements:
                continue
            
            processed_elements.add(parent)
            
            # 親要素から情報を抽出
            cat_data = self._extract_cat_from_element(parent, base_url, i)
            if cat_data:
                cats.append(cat_data)
        
        return cats

    def _extract_cat_from_cells(self, cells: List[Tag], headers: List[str], base_url: str, index: int) -> Optional[Dict[str, Any]]:
        """テーブルセルから猫データを抽出"""
        try:
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            combined_text = ' '.join(cell_texts)
            
            # 基本情報
            name = cell_texts[0] if cell_texts[0] else f'保護猫{index:03d}号'
            
            return self._create_cat_data(
                name=name,
                text_content=combined_text,
                element=cells[0] if cells else None,
                base_url=base_url,
                index=index
            )
            
        except Exception as e:
            logger.warning(f"Failed to extract from table cells: {e}")
            return None

    def _extract_cat_from_card(self, card: Tag, base_url: str, index: int) -> Optional[Dict[str, Any]]:
        """カード要素から猫データを抽出"""
        try:
            # dl/dt/dd 構造を確認
            dl_elements = card.find_all('dl')
            card_info = {}
            
            for dl in dl_elements:
                dts = dl.find_all('dt')
                dds = dl.find_all('dd')
                
                for dt, dd in zip(dts, dds):
                    key = dt.get_text(strip=True)
                    value = dd.get_text(strip=True)
                    card_info[key] = value
            
            # 名前を取得
            name = card_info.get('名前', card_info.get('なまえ', f'保護猫{index:03d}号'))
            
            return self._create_cat_data(
                name=name,
                text_content=card.get_text(),
                element=card,
                base_url=base_url,
                index=index,
                extracted_info=card_info
            )
            
        except Exception as e:
            logger.warning(f"Failed to extract from card: {e}")
            return None

    def _extract_cat_from_element(self, element: Tag, base_url: str, index: int) -> Optional[Dict[str, Any]]:
        """汎用要素から猫データを抽出"""
        try:
            text_content = element.get_text()
            
            return self._create_cat_data(
                name=f'保護猫{index:03d}号',
                text_content=text_content,
                element=element,
                base_url=base_url,
                index=index
            )
            
        except Exception as e:
            logger.warning(f"Failed to extract from element: {e}")
            return None

    def _create_cat_data(self, name: str, text_content: str, element: Optional[Tag], 
                        base_url: str, index: int, extracted_info: Dict = None) -> Dict[str, Any]:
        """猫データオブジェクトを作成"""
        
        if extracted_info is None:
            extracted_info = {}
        
        # 画像URL抽出
        images = []
        if element:
            img_tags = element.find_all('img')
            for img in img_tags:
                src = img.get('src')
                if src:
                    from urllib.parse import urljoin
                    images.append(urljoin(base_url, src))
        
        # テキストからの情報抽出
        gender = self._extract_gender(text_content)
        age_estimate = self._extract_age(text_content)
        color = self._extract_color(text_content)
        deadline_date = self._extract_deadline_date(text_content)
        
        return {
            'external_id': f'local_extracted_{index:03d}',
            'animal_type': 'cat',
            'name': name,
            'breed': extracted_info.get('品種', extracted_info.get('種類', 'ミックス')),
            'age_estimate': extracted_info.get('年齢', age_estimate),
            'gender': extracted_info.get('性別', gender),
            'color': extracted_info.get('毛色', extracted_info.get('色', color)),
            'size': 'medium',
            'health_status': extracted_info.get('健康状態', None),
            'personality': extracted_info.get('性格', None),
            'special_needs': extracted_info.get('備考', None),
            'images': images[:3],  # 最大3枚
            'protection_date': (datetime.now() - timedelta(days=7)).date(),
            'deadline_date': deadline_date,
            'status': 'available',
            'transfer_decided': False,
            'source_url': base_url
        }

    def _contains_cat_keywords(self, text: str) -> bool:
        """猫関連キーワードが含まれているかチェック"""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.cat_keywords['general'])

    def _extract_gender(self, text: str) -> Optional[str]:
        """性別を抽出"""
        if re.search(self.gender_patterns[0], text, re.IGNORECASE):
            return 'male'
        elif re.search(self.gender_patterns[1], text, re.IGNORECASE):
            return 'female'
        return 'unknown'

    def _extract_age(self, text: str) -> Optional[str]:
        """年齢を抽出"""
        for pattern in self.age_patterns:
            match = re.search(pattern, text)
            if match:
                if '子猫' in pattern:
                    return '子猫'
                elif '成猫' in pattern:
                    return '成猫'
                elif 'シニア' in pattern or '高齢' in pattern:
                    return 'シニア猫'
                elif match.groups():
                    number = match.group(1)
                    if 'ヶ月' in text or 'か月' in text:
                        return f'生後{number}ヶ月'
                    elif '歳' in text or '才' in text:
                        return f'{number}歳'
        
        return None

    def _extract_color(self, text: str) -> Optional[str]:
        """毛色を抽出"""
        for color in self.cat_keywords['color']:
            if color in text:
                return color
        return None

    def _extract_deadline_date(self, text: str) -> Optional[datetime]:
        """期限日を抽出"""
        for pattern in self.date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if len(match.groups()) == 3:
                        year, month, day = match.groups()
                        return datetime(int(year), int(month), int(day)).date()
                    elif len(match.groups()) == 2:
                        month, day = match.groups()
                        current_year = datetime.now().year
                        return datetime(current_year, int(month), int(day)).date()
                except (ValueError, TypeError):
                    continue
        
        # dateparser を使用した柔軟な日付解析
        try:
            parsed_date = dateparser.parse(text, languages=['ja'])
            if parsed_date and parsed_date.date() > datetime.now().date():
                return parsed_date.date()
        except Exception:
            pass
        
        return None

    def _aggressive_keyword_search(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """積極的なキーワード検索（見逃し防止）"""
        cats = []
        
        # すべてのテキストノードから猫関連の文章を検索
        all_text = soup.get_text()
        
        # 猫関連キーワードが含まれるpタグ、divタグを全て取得
        potential_elements = []
        for tag in ['p', 'div', 'span', 'td', 'li', 'article', 'section']:
            elements = soup.find_all(tag)
            for element in elements:
                text = element.get_text().lower()
                if any(keyword in text for keyword in self.cat_keywords['general']):
                    potential_elements.append(element)
        
        # 重複を除去
        unique_elements = []
        for element in potential_elements:
            if element not in unique_elements:
                unique_elements.append(element)
        
        # 各要素から猫データを抽出
        for i, element in enumerate(unique_elements[:20], 1):  # 最大20件
            text = element.get_text()
            # 猫のデータらしい（年齢、性別、色などの情報を含む）
            if (any(keyword in text for keyword in self.cat_keywords['age']) or
                any(keyword in text for keyword in self.cat_keywords['gender']) or
                any(keyword in text for keyword in self.cat_keywords['color']) or
                any(keyword in text for keyword in self.cat_keywords['status'])):
                
                cat_data = self._extract_cat_from_element(element, base_url, i + 1000)  # 番号を大きくして区別
                if cat_data:
                    cat_data['external_id'] = f'aggressive_search_{i:03d}'
                    cats.append(cat_data)
        
        return cats

    def _deduplicate_cats(self, cats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """猫データの重複を除去"""
        if not cats:
            return []
        
        unique_cats = []
        seen_names = set()
        seen_external_ids = set()
        
        for cat in cats:
            # external_idでの重複チェック
            external_id = cat.get('external_id', '')
            if external_id in seen_external_ids:
                continue
            
            # 名前での重複チェック（類似判定）
            name = cat.get('name', '').lower()
            if name and name in seen_names:
                continue
            
            # 画像URLでの重複チェック
            images = cat.get('images', [])
            duplicate_found = False
            for existing_cat in unique_cats:
                existing_images = existing_cat.get('images', [])
                if images and existing_images:
                    # 画像URLが一致する場合は重複
                    if any(img in existing_images for img in images):
                        duplicate_found = True
                        break
            
            if not duplicate_found:
                unique_cats.append(cat)
                seen_names.add(name)
                seen_external_ids.add(external_id)
        
        return unique_cats

# グローバルエクストラクターインスタンス
local_extractor = LocalExtractor()