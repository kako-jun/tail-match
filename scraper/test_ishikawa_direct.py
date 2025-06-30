#!/usr/bin/env python3
"""
Direct Ishikawa Prefecture Scraping Test
石川県保護センターの直接スクレイピングテスト（DB不要）
"""

import requests
import time
import logging
from bs4 import BeautifulSoup
from local_extractor import local_extractor
from ishikawa_scraper import IshikawaScraper

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def test_url_direct(url: str, name: str):
    """URLを直接テスト（DB接続不要）"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing: {name}")
    print(f"🔗 URL: {url}")
    print(f"{'='*60}")
    
    try:
        # User-Agentを設定してリクエスト
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; TailMatch/1.0; +https://tailmatch.jp/robots)'
        }
        
        print("📡 Fetching webpage...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        print(f"✅ HTTP {response.status_code} - {len(response.text)} characters")
        
        # HTMLを解析
        print("🔍 Parsing HTML...")
        soup = BeautifulSoup(response.text, 'lxml')
        
        # タイトル確認
        title = soup.title.string if soup.title else "No title"
        print(f"📄 Page title: {title}")
        
        # 猫関連キーワードをチェック
        text_content = soup.get_text().lower()
        cat_keywords = ['猫', 'ネコ', 'ねこ', 'cat', '動物', '保護', '譲渡', '里親']
        found_keywords = [kw for kw in cat_keywords if kw in text_content]
        
        print(f"🔤 Found keywords: {found_keywords}")
        
        # ローカル抽出を試行
        print("🤖 Running local extraction...")
        extracted_cats = local_extractor.extract_from_html(soup, url)
        
        print(f"🐱 Extracted cats: {len(extracted_cats)}")
        
        # 結果の詳細を表示
        if extracted_cats:
            print("\n📋 Extraction Results:")
            for i, cat in enumerate(extracted_cats, 1):
                print(f"  Cat #{i}:")
                print(f"    Name: {cat.get('name', 'N/A')}")
                print(f"    Gender: {cat.get('gender', 'N/A')}")
                print(f"    Age: {cat.get('age_estimate', 'N/A')}")
                print(f"    Color: {cat.get('color', 'N/A')}")
                print(f"    External ID: {cat.get('external_id', 'N/A')}")
                print(f"    Method: {cat.get('extraction_method', 'N/A')}")
                if cat.get('images'):
                    print(f"    Images: {len(cat['images'])} found")
                print()
        else:
            print("⚠️  No cats extracted")
            
            # HTMLの構造を分析
            print("\n🔍 HTML Structure Analysis:")
            
            # テーブルをチェック
            tables = soup.find_all('table')
            print(f"  Tables found: {len(tables)}")
            for i, table in enumerate(tables[:3], 1):
                table_text = table.get_text()[:100]
                print(f"    Table {i}: {table_text}...")
            
            # カード的な構造をチェック
            divs_with_class = soup.find_all('div', class_=True)
            print(f"  Divs with classes: {len(divs_with_class)}")
            
            # リストをチェック
            lists = soup.find_all(['ul', 'ol'])
            print(f"  Lists found: {len(lists)}")
            
            # 猫関連のテキストを含む要素をサンプル表示
            print("\n📝 Sample text containing cat keywords:")
            elements_with_cats = soup.find_all(text=lambda text: text and any(kw in text.lower() for kw in ['猫', 'ネコ', 'ねこ']))
            for i, text in enumerate(elements_with_cats[:3], 1):
                clean_text = ' '.join(text.strip().split())
                if len(clean_text) > 10:
                    print(f"    {i}: {clean_text[:100]}...")
        
        return {
            'success': True,
            'cats_found': len(extracted_cats),
            'title': title,
            'keywords_found': found_keywords,
            'cats': extracted_cats
        }
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return {'success': False, 'error': str(e)}
    except Exception as e:
        print(f"❌ Processing error: {e}")
        return {'success': False, 'error': str(e)}

def main():
    """メインテスト"""
    print("🐱 Tail Match - Ishikawa Prefecture Direct Scraping Test")
    print("=" * 60)
    
    # テスト対象のURL
    test_urls = {
        'いしかわ動物愛護センター': 'https://aigo-ishikawa.jp/petadoption_list/',
        '金沢市動物愛護管理センター': 'https://www4.city.kanazawa.lg.jp/soshikikarasagasu/dobutsuaigokanricenter/gyomuannai/1/jouto_info/index.html'
    }
    
    results = {}
    
    for name, url in test_urls.items():
        results[name] = test_url_direct(url, name)
        
        # 次のリクエストまで間隔をあける（礼儀正しく）
        if len(results) < len(test_urls):
            print("⏳ Waiting 5 seconds before next request...")
            time.sleep(5)
    
    # 総合結果
    print(f"\n{'='*60}")
    print("📊 SUMMARY RESULTS")
    print(f"{'='*60}")
    
    total_cats = 0
    successful_sites = 0
    
    for name, result in results.items():
        status = "✅ SUCCESS" if result['success'] else "❌ FAILED"
        cats = result.get('cats_found', 0)
        total_cats += cats
        
        if result['success']:
            successful_sites += 1
        
        print(f"{name}: {status} - {cats} cats found")
        
        if not result['success']:
            print(f"  Error: {result.get('error', 'Unknown error')}")
    
    print(f"\nOverall:")
    print(f"  Sites tested: {len(test_urls)}")
    print(f"  Successful: {successful_sites}")
    print(f"  Total cats found: {total_cats}")
    
    if total_cats > 0:
        print("\n🎉 SUCCESS! Found cats in Ishikawa Prefecture!")
    else:
        print("\n⚠️  No cats found. This could mean:")
        print("   1. No cats currently available for adoption")
        print("   2. Website structure needs specific handling")
        print("   3. Content is dynamically loaded (JavaScript)")

if __name__ == '__main__':
    main()