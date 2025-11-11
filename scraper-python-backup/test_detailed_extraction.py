#!/usr/bin/env python3
"""
Detailed Extraction Analysis for Ishikawa Sites
石川県サイトの詳細抽出分析
"""

import requests
import re
from bs4 import BeautifulSoup

def analyze_ishikawa_aigo():
    """いしかわ動物愛護センターの詳細分析"""
    url = 'https://aigo-ishikawa.jp/petadoption_list/'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; python-requests/2.31.0)'
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'lxml')
    
    print("🔍 Analyzing Ishikawa Animal Protection Center HTML structure...")
    
    # 特定のクラスやID付きの要素を探す
    print("\n1. Looking for specific animal containers...")
    
    # .data_boxes や .data_box を探す
    data_boxes = soup.select('.data_boxes')
    print(f"   Found .data_boxes: {len(data_boxes)}")
    
    data_box_items = soup.select('.data_box')
    print(f"   Found .data_box: {len(data_box_items)}")
    
    # 最初のいくつかを詳細分析
    for i, box in enumerate(data_box_items[:3], 1):
        print(f"\n   === Data Box {i} ===")
        print(f"   Classes: {box.get('class', [])}")
        
        # dl/dt/dd 構造をチェック
        dls = box.find_all('dl')
        print(f"   DL elements: {len(dls)}")
        
        for dl in dls:
            dts = dl.find_all('dt')
            dds = dl.find_all('dd')
            print(f"   DT/DD pairs: {len(dts)}/{len(dds)}")
            
            for dt, dd in zip(dts, dds):
                dt_text = dt.get_text(strip=True)
                dd_text = dd.get_text(strip=True)
                print(f"     {dt_text}: {dd_text}")
        
        # 画像をチェック
        images = box.find_all('img')
        print(f"   Images: {len(images)}")
        for img in images:
            src = img.get('src', '')
            alt = img.get('alt', '')
            print(f"     Image: {src} (alt: {alt})")
        
        print(f"   Raw text sample: {box.get_text()[:200]}...")
    
    # 猫専用のクラスを探す
    print("\n2. Looking for cat-specific elements...")
    cat_elements = soup.select('[class*="cat"]')
    print(f"   Elements with 'cat' in class: {len(cat_elements)}")
    
    neko_elements = soup.find_all(class_=re.compile(r'.*猫.*|.*ネコ.*|.*ねこ.*'))
    print(f"   Elements with Japanese 'cat' in class: {len(neko_elements)}")
    
    # テキストパターンを分析
    print("\n3. Analyzing text patterns...")
    all_text = soup.get_text()
    
    # 性別パターン
    gender_matches = re.findall(r'(オス|メス|雄|雌|♂|♀)', all_text)
    print(f"   Gender mentions: {len(set(gender_matches))} unique - {set(gender_matches)}")
    
    # 年齢パターン  
    age_matches = re.findall(r'(生後\d+[ヶか]?月|約?\d+歳|子猫|成猫|シニア)', all_text)
    print(f"   Age mentions: {len(age_matches)} - {age_matches[:10]}")
    
    # 色パターン
    color_matches = re.findall(r'(白|黒|茶|灰|三毛|みけ|キジ|サビ|茶白|白黒)', all_text)
    print(f"   Color mentions: {len(color_matches)} - {set(color_matches)}")
    
    # 番号パターン
    number_matches = re.findall(r'(No\.\s*\d+|№\s*\d+|\d+番)', all_text)
    print(f"   Number mentions: {len(number_matches)} - {number_matches[:10]}")

def analyze_kanazawa_city():
    """金沢市動物愛護管理センターの詳細分析"""
    url = 'https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/index.html'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; python-requests/2.31.0)'
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'lxml')
    
    print("\n🔍 Analyzing Kanazawa City HTML structure...")
    
    # テーブル構造を分析
    print("\n1. Table analysis...")
    tables = soup.find_all('table')
    print(f"   Found tables: {len(tables)}")
    
    for i, table in enumerate(tables, 1):
        table_text = table.get_text().lower()
        if any(keyword in table_text for keyword in ['猫', 'ネコ', 'ねこ', '動物']):
            print(f"\n   === Table {i} (contains animal keywords) ===")
            rows = table.find_all('tr')
            print(f"   Rows: {len(rows)}")
            
            # ヘッダー行
            if rows:
                headers = [th.get_text(strip=True) for th in rows[0].find_all(['th', 'td'])]
                print(f"   Headers: {headers}")
                
                # データ行サンプル
                for j, row in enumerate(rows[1:3], 1):
                    cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                    print(f"   Row {j}: {cells}")
    
    # 文字エンコーディングの問題をチェック
    print("\n2. Character encoding check...")
    title = soup.title.string if soup.title else "No title"
    print(f"   Page title (raw): {repr(title)}")
    
    # 正しいエンコーディングで再取得を試行
    response_utf8 = requests.get(url, headers=headers, timeout=30)
    response_utf8.encoding = 'utf-8'
    soup_utf8 = BeautifulSoup(response_utf8.text, 'lxml')
    title_utf8 = soup_utf8.title.string if soup_utf8.title else "No title"
    print(f"   Page title (UTF-8): {title_utf8}")

def main():
    print("🐱 Detailed HTML Structure Analysis for Ishikawa Prefecture")
    print("=" * 60)
    
    try:
        analyze_ishikawa_aigo()
    except Exception as e:
        print(f"❌ Error analyzing Ishikawa Aigo: {e}")
    
    try:
        analyze_kanazawa_city()
    except Exception as e:
        print(f"❌ Error analyzing Kanazawa City: {e}")

if __name__ == '__main__':
    main()