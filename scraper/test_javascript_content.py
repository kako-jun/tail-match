#!/usr/bin/env python3
"""
JavaScript Content Detection for Ishikawa Sites
JavaScriptで読み込まれる動的コンテンツの検出
"""

import requests
import re
from bs4 import BeautifulSoup

def detect_javascript_content(url: str, name: str):
    """JavaScriptによる動的読み込みを検出"""
    print(f"\n{'='*60}")
    print(f"🔍 JavaScript Content Detection: {name}")
    print(f"🔗 URL: {url}")
    print(f"{'='*60}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; TailMatch/1.0; +https://tailmatch.jp/robots)'
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'lxml')
    
    # 1. JavaScript ファイルを確認
    print("1. JavaScript files loaded:")
    scripts = soup.find_all('script', src=True)
    for script in scripts:
        src = script.get('src')
        print(f"   - {src}")
    
    # 2. インライン JavaScript を確認
    print(f"\n2. Inline JavaScript blocks: {len(soup.find_all('script', src=False))}")
    inline_scripts = soup.find_all('script', src=False)
    for i, script in enumerate(inline_scripts[:3], 1):
        script_content = script.string or ""
        if len(script_content) > 50:
            print(f"   Script {i} preview: {script_content[:100]}...")
    
    # 3. AJAX や fetch の痕跡を探す
    print("\n3. AJAX/Fetch indicators:")
    all_scripts = soup.find_all('script')
    ajax_keywords = ['ajax', 'fetch', 'XMLHttpRequest', '$.get', '$.post', 'axios']
    
    for keyword in ajax_keywords:
        found = False
        for script in all_scripts:
            script_text = str(script).lower()
            if keyword.lower() in script_text:
                print(f"   ✅ Found '{keyword}' in JavaScript")
                found = True
                break
        if not found:
            print(f"   ❌ '{keyword}' not found")
    
    # 4. API エンドポイントの可能性を探す
    print("\n4. Potential API endpoints:")
    api_patterns = [
        r'/api/[^\s"\']+',
        r'/json[^\s"\']*',
        r'\.json[^\s"\']*',
        r'/data/[^\s"\']+',
        r'ajax[^\s"\']*'
    ]
    
    full_html = str(soup).lower()
    for pattern in api_patterns:
        matches = re.findall(pattern, full_html)
        if matches:
            unique_matches = list(set(matches))
            print(f"   Pattern '{pattern}': {unique_matches[:5]}")
    
    # 5. データ属性やIDを確認
    print("\n5. Data attributes and IDs:")
    elements_with_data = soup.find_all(attrs={'data-url': True})
    print(f"   Elements with data-url: {len(elements_with_data)}")
    
    elements_with_ids = soup.find_all(id=True)
    relevant_ids = [elem.get('id') for elem in elements_with_ids if any(word in elem.get('id', '').lower() for word in ['pet', 'animal', 'cat', 'dog', 'list', 'data'])]
    print(f"   Relevant IDs: {relevant_ids}")
    
    # 6. 空のコンテナを探す
    print("\n6. Empty containers (likely filled by JS):")
    empty_divs = soup.find_all('div', class_=True)
    for div in empty_divs:
        div_text = div.get_text(strip=True)
        if not div_text and len(div.find_all()) == 0:  # テキストも子要素もない
            classes = div.get('class', [])
            print(f"   Empty div with classes: {classes}")
    
    # 7. 動物関連のクラス名やIDを広く探す
    print("\n7. Animal-related class names and IDs:")
    all_elements = soup.find_all(['div', 'section', 'article', 'ul', 'li'])
    for element in all_elements[:20]:  # 最初の20要素をチェック
        classes = element.get('class', [])
        element_id = element.get('id', '')
        
        # 動物関連のキーワードをチェック
        combined = ' '.join(classes) + ' ' + element_id
        if any(word in combined.lower() for word in ['pet', 'animal', 'cat', 'dog', 'adoption', 'adopt']):
            print(f"   Element: {element.name}, classes: {classes}, id: {element_id}")
            text_preview = element.get_text(strip=True)[:50]
            print(f"     Text preview: {text_preview}...")

def main():
    print("🔍 JavaScript Content Detection for Ishikawa Sites")
    print("=" * 60)
    
    test_sites = {
        'いしかわ動物愛護センター': 'https://aigo-ishikawa.jp/petadoption_list/',
        '金沢市動物愛護管理センター': 'https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/index.html'
    }
    
    for name, url in test_sites.items():
        try:
            detect_javascript_content(url, name)
        except Exception as e:
            print(f"❌ Error analyzing {name}: {e}")

if __name__ == '__main__':
    main()