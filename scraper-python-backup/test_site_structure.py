#!/usr/bin/env python3
"""
サイト構造調査スクリプト
各自治体のウェブサイトにアクセスして、HTML構造を分析する
"""

import requests
from bs4 import BeautifulSoup
import time
import json

# より標準的なブラウザのUser-Agent（自治体サイトのブロック回避）
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
}

# 調査対象サイト
SITES_TO_INVESTIGATE = [
    {
        'name': '東京都動物愛護相談センター',
        'url': 'https://www.fukushihoken.metro.tokyo.lg.jp/douso/jouto/cat_jouto.html',
        'prefecture': '東京都'
    },
    {
        'name': '神奈川県動物保護センター',
        'url': 'https://www.pref.kanagawa.jp/docs/v7d/cnt/f80192/p1190156.html',
        'prefecture': '神奈川県'
    },
    {
        'name': '大阪府動物愛護管理センター',
        'url': 'http://www.pref.osaka.lg.jp/doaicenter/joutojouhou/index.html',
        'prefecture': '大阪府'
    },
    {
        'name': '愛知県動物愛護センター',
        'url': 'https://www.pref.aichi.jp/soshiki/dobutsu/neko-joto.html',
        'prefecture': '愛知県'
    },
    {
        'name': '福岡県動物愛護センター',
        'url': 'https://www.pref.fukuoka.lg.jp/contents/jyoutocat.html',
        'prefecture': '福岡県'
    },
    {
        'name': '北海道動物愛護センター',
        'url': 'https://www.pref.hokkaido.lg.jp/hf/kse/dog-cat/animal-information.html',
        'prefecture': '北海道'
    },
    {
        'name': '宮城県動物愛護センター',
        'url': 'https://www.pref.miyagi.jp/soshiki/doubutuaigo/jyoutoneko.html',
        'prefecture': '宮城県'
    },
    {
        'name': '千葉県動物愛護センター',
        'url': 'https://www.pref.chiba.lg.jp/aigo/jouhou/jouhou-top.html',
        'prefecture': '千葉県'
    }
]

def analyze_html_structure(html_content, url):
    """HTML構造を分析"""
    soup = BeautifulSoup(html_content, 'html.parser')

    analysis = {
        'html_length': len(html_content),
        'title': soup.title.string if soup.title else 'N/A',
        'has_javascript_frameworks': False,
        'framework_detected': [],
        'possible_containers': [],
        'tables': [],
        'lists': [],
        'image_count': 0,
        'link_count': 0,
        'empty_state_keywords': []
    }

    # JavaScriptフレームワーク検出
    if 'react' in html_content.lower() or 'data-reactroot' in html_content:
        analysis['has_javascript_frameworks'] = True
        analysis['framework_detected'].append('React')
    if 'vue' in html_content.lower() or 'v-app' in html_content:
        analysis['has_javascript_frameworks'] = True
        analysis['framework_detected'].append('Vue')
    if 'angular' in html_content.lower() or 'ng-app' in html_content:
        analysis['has_javascript_frameworks'] = True
        analysis['framework_detected'].append('Angular')

    # コンテナ候補を探す
    possible_selectors = [
        '.animal-list', '.cat-list', '.neko-list',
        '#animal-list', '#cat-list', '#neko-list',
        '.data_boxes', '.data_box',
        '.item-list', '.card-list',
        'table.animal', 'table.cat',
        'div[class*="joto"]', 'div[class*="jouto"]',
        'div[class*="animal"]', 'div[class*="cat"]', 'div[class*="neko"]'
    ]

    for selector in possible_selectors:
        elements = soup.select(selector)
        if elements:
            analysis['possible_containers'].append({
                'selector': selector,
                'count': len(elements),
                'first_element_text': elements[0].get_text(strip=True)[:100] if elements else ''
            })

    # テーブル構造
    tables = soup.find_all('table')
    for i, table in enumerate(tables[:5]):  # 最初の5個まで
        rows = table.find_all('tr')
        analysis['tables'].append({
            'index': i,
            'row_count': len(rows),
            'has_thead': bool(table.find('thead')),
            'first_row_text': rows[0].get_text(strip=True)[:100] if rows else ''
        })

    # リスト構造
    lists = soup.find_all(['ul', 'ol'])
    for i, lst in enumerate(lists[:5]):
        items = lst.find_all('li')
        if len(items) > 2:  # 3個以上のli要素があるリスト
            analysis['lists'].append({
                'index': i,
                'tag': lst.name,
                'item_count': len(items),
                'first_item_text': items[0].get_text(strip=True)[:100] if items else ''
            })

    # 画像・リンク数
    analysis['image_count'] = len(soup.find_all('img'))
    analysis['link_count'] = len(soup.find_all('a'))

    # 空状態キーワード検出
    empty_keywords = [
        '現在、譲渡可能な猫はいません',
        '譲渡対象の猫はいません',
        '掲載されている猫はいません',
        '募集中の猫はいません',
        '該当する動物はいません'
    ]

    page_text = soup.get_text()
    for keyword in empty_keywords:
        if keyword in page_text:
            analysis['empty_state_keywords'].append(keyword)

    return analysis

def investigate_sites():
    """全サイトを調査"""
    results = []

    for site in SITES_TO_INVESTIGATE:
        print(f"\n{'='*60}")
        print(f"調査中: {site['name']} ({site['prefecture']})")
        print(f"URL: {site['url']}")
        print('='*60)

        try:
            response = requests.get(site['url'], headers=HEADERS, timeout=10)

            result = {
                'name': site['name'],
                'prefecture': site['prefecture'],
                'url': site['url'],
                'status_code': response.status_code,
                'success': response.status_code == 200
            }

            if response.status_code == 200:
                analysis = analyze_html_structure(response.text, site['url'])
                result['analysis'] = analysis

                # 主要な発見を表示
                print(f"✓ アクセス成功 (HTML長: {analysis['html_length']} 文字)")
                print(f"  タイトル: {analysis['title']}")
                print(f"  JSフレームワーク: {analysis['framework_detected'] if analysis['framework_detected'] else 'なし'}")
                print(f"  可能なコンテナ: {len(analysis['possible_containers'])} 個")
                print(f"  テーブル: {len(analysis['tables'])} 個")
                print(f"  リスト: {len(analysis['lists'])} 個")
                print(f"  画像: {analysis['image_count']} 個")
                print(f"  空状態キーワード: {analysis['empty_state_keywords']}")

                if analysis['possible_containers']:
                    print("\n  検出されたコンテナ:")
                    for container in analysis['possible_containers'][:3]:
                        print(f"    - {container['selector']}: {container['count']}個")

            else:
                print(f"✗ HTTPエラー: {response.status_code}")
                result['error'] = f"HTTP {response.status_code}"

            results.append(result)

        except requests.exceptions.SSLError as e:
            print(f"✗ SSL エラー: {str(e)[:100]}")
            results.append({
                'name': site['name'],
                'prefecture': site['prefecture'],
                'url': site['url'],
                'success': False,
                'error': 'SSL Error'
            })
        except requests.exceptions.RequestException as e:
            print(f"✗ リクエストエラー: {str(e)[:100]}")
            results.append({
                'name': site['name'],
                'prefecture': site['prefecture'],
                'url': site['url'],
                'success': False,
                'error': str(e)[:100]
            })

        # 礼儀正しく待機
        time.sleep(4)

    return results

if __name__ == '__main__':
    print("="*60)
    print("動物愛護施設サイト構造調査")
    print("="*60)

    results = investigate_sites()

    # 結果をJSON保存
    output_file = 'site_structure_investigation.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n\n{'='*60}")
    print("調査完了")
    print(f"結果を {output_file} に保存しました")
    print('='*60)

    # サマリー表示
    success_count = sum(1 for r in results if r.get('success'))
    print(f"\n成功: {success_count}/{len(results)} サイト")

    # JavaScriptフレームワーク使用サイト
    js_sites = [r for r in results if r.get('success') and r.get('analysis', {}).get('has_javascript_frameworks')]
    if js_sites:
        print(f"\nJavaScriptフレームワーク使用: {len(js_sites)} サイト")
        for site in js_sites:
            print(f"  - {site['prefecture']}: {site['analysis']['framework_detected']}")
