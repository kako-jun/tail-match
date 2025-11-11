#!/usr/bin/env python3
"""
Playwright Site Investigation
実際のブラウザでアクセスしてサイト構造を調査
"""

import asyncio
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# 調査対象サイト
SITES_TO_INVESTIGATE = [
    {
        'name': '東京都動物愛護相談センター',
        'url': 'https://www.fukushihoken.metro.tokyo.lg.jp/douso/jouto/cat_jouto.html',
        'prefecture': '東京都',
        'region': 'kanto'
    },
    {
        'name': '神奈川県動物保護センター',
        'url': 'https://www.pref.kanagawa.jp/docs/v7d/cnt/f80192/p1190156.html',
        'prefecture': '神奈川県',
        'region': 'kanto'
    },
    {
        'name': '千葉県動物愛護センター',
        'url': 'https://www.pref.chiba.lg.jp/aigo/jouhou/jouhou-top.html',
        'prefecture': '千葉県',
        'region': 'kanto'
    },
    {
        'name': '大阪府動物愛護管理センター',
        'url': 'http://www.pref.osaka.lg.jp/doaicenter/joutojouhou/index.html',
        'prefecture': '大阪府',
        'region': 'kinki'
    },
    {
        'name': '愛知県動物愛護センター',
        'url': 'https://www.pref.aichi.jp/soshiki/dobutsu/neko-joto.html',
        'prefecture': '愛知県',
        'region': 'chubu'
    }
]

async def analyze_page_structure(page, url):
    """ページ構造を分析"""
    try:
        # ページを開く
        print(f"  📡 Loading {url}...")
        await page.goto(url, wait_until='networkidle', timeout=30000)

        # ページが読み込まれるまで待機
        await page.wait_for_timeout(2000)

        # HTMLを取得
        html = await page.content()
        soup = BeautifulSoup(html, 'html.parser')

        analysis = {
            'html_length': len(html),
            'title': await page.title(),
            'url': page.url,  # リダイレクト後のURL
            'screenshot_path': None,
            'structure': {}
        }

        # スクリーンショット撮影
        screenshot_filename = f"screenshot_{url.split('//')[1].replace('/', '_').replace('.', '_')[:50]}.png"
        try:
            await page.screenshot(path=screenshot_filename, full_page=False)
            analysis['screenshot_path'] = screenshot_filename
            print(f"  📸 Screenshot saved: {screenshot_filename}")
        except Exception as e:
            print(f"  ⚠️  Screenshot failed: {e}")

        # 構造分析
        print(f"  🔍 Analyzing structure...")

        # テーブルを探す
        tables = soup.find_all('table')
        analysis['structure']['tables'] = []
        for i, table in enumerate(tables[:5]):
            rows = table.find_all('tr')
            table_data = {
                'index': i,
                'rows': len(rows),
                'has_thead': bool(table.find('thead')),
                'classes': table.get('class', []),
                'sample_text': table.get_text(strip=True)[:200]
            }
            analysis['structure']['tables'].append(table_data)

        # 猫関連のキーワードを含む要素を探す
        cat_keywords = ['猫', 'ネコ', 'ねこ']
        keyword_elements = []

        for keyword in cat_keywords:
            elements = soup.find_all(text=lambda t: t and keyword in t)
            if elements:
                keyword_elements.append({
                    'keyword': keyword,
                    'count': len(elements),
                    'sample': [elem.strip()[:100] for elem in elements[:3] if elem.strip()]
                })

        analysis['structure']['cat_keywords'] = keyword_elements

        # 画像を探す
        images = soup.find_all('img')
        analysis['structure']['images'] = {
            'total': len(images),
            'alt_texts': [img.get('alt', '')[:50] for img in images[:10] if img.get('alt')]
        }

        # リストを探す
        lists = soup.find_all(['ul', 'ol'])
        analysis['structure']['lists'] = {
            'total': len(lists),
            'large_lists': sum(1 for lst in lists if len(lst.find_all('li')) > 3)
        }

        # 可能性のあるコンテナを探す
        possible_containers = []
        selectors_to_check = [
            ('.animal-list', 'animal-list class'),
            ('.cat-list', 'cat-list class'),
            ('.jouto-list', 'jouto-list class'),
            ('.data_box', 'data_box class'),
            ('[class*="animal"]', 'animal in class'),
            ('[class*="cat"]', 'cat in class'),
            ('[class*="neko"]', 'neko in class')
        ]

        for selector, desc in selectors_to_check:
            elements = soup.select(selector)
            if elements:
                possible_containers.append({
                    'selector': selector,
                    'description': desc,
                    'count': len(elements),
                    'sample_text': elements[0].get_text(strip=True)[:100] if elements else ''
                })

        analysis['structure']['possible_containers'] = possible_containers

        # JavaScriptフレームワーク検出
        frameworks = []
        if 'react' in html.lower() or 'data-reactroot' in html:
            frameworks.append('React')
        if 'vue' in html.lower() or 'v-app' in html:
            frameworks.append('Vue')
        if 'angular' in html.lower() or 'ng-app' in html:
            frameworks.append('Angular')

        analysis['structure']['javascript_frameworks'] = frameworks

        # 空状態の検出
        empty_keywords = [
            '現在、譲渡可能な猫はいません',
            '譲渡対象の猫はいません',
            '掲載されている猫はいません',
            '募集中の猫はいません'
        ]

        page_text = soup.get_text()
        found_empty_keywords = [kw for kw in empty_keywords if kw in page_text]
        analysis['structure']['empty_state_keywords'] = found_empty_keywords

        print(f"  ✅ Analysis complete")
        print(f"     - Tables: {len(analysis['structure']['tables'])}")
        print(f"     - Images: {analysis['structure']['images']['total']}")
        print(f"     - JS Frameworks: {frameworks if frameworks else 'None'}")
        print(f"     - Possible containers: {len(possible_containers)}")

        return {'success': True, 'analysis': analysis}

    except Exception as e:
        print(f"  ❌ Error: {str(e)[:100]}")
        return {'success': False, 'error': str(e)}

async def investigate_sites():
    """全サイトを調査"""
    results = []

    async with async_playwright() as p:
        # ブラウザを起動
        print("🚀 Launching browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        for site in SITES_TO_INVESTIGATE:
            print(f"\n{'='*60}")
            print(f"📋 {site['name']} ({site['prefecture']})")
            print(f"   {site['url']}")
            print('='*60)

            result = await analyze_page_structure(page, site['url'])
            result.update({
                'name': site['name'],
                'prefecture': site['prefecture'],
                'region': site['region'],
                'url': site['url']
            })
            results.append(result)

            # 礼儀正しく待機
            await asyncio.sleep(4)

        await browser.close()

    return results

async def main():
    print("="*60)
    print("🐱 Playwright Site Structure Investigation")
    print("="*60)

    results = await investigate_sites()

    # JSON保存
    output_file = 'playwright_investigation_results.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"✅ Investigation complete")
    print(f"   Results saved to: {output_file}")
    print('='*60)

    # サマリー表示
    success_count = sum(1 for r in results if r.get('success'))
    print(f"\n📊 Summary:")
    print(f"   Investigated: {len(results)} sites")
    print(f"   Successful: {success_count}")
    print(f"   Failed: {len(results) - success_count}")

    # パターン検出
    js_sites = [r for r in results if r.get('success') and r['analysis']['structure'].get('javascript_frameworks')]
    if js_sites:
        print(f"\n🔧 JavaScript Frameworks detected:")
        for site in js_sites:
            print(f"   - {site['prefecture']}: {site['analysis']['structure']['javascript_frameworks']}")

    # テーブルベースのサイト
    table_sites = [r for r in results if r.get('success') and r['analysis']['structure'].get('tables')]
    if table_sites:
        print(f"\n📊 Table-based sites:")
        for site in table_sites:
            table_count = len(site['analysis']['structure']['tables'])
            print(f"   - {site['prefecture']}: {table_count} tables")

if __name__ == '__main__':
    asyncio.run(main())
