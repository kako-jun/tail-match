#!/usr/bin/env python3
"""
Test Ishikawa Prefecture Cat Shelter Scraping with Playwright
石川県猫保護施設の動的スクレイピングテスト
"""

import logging
import os
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from local_extractor import local_extractor
from urllib.parse import urljoin

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_ishikawa_cat_shelter_dynamic():
    """石川県猫保護施設の動的コンテンツ取得テスト"""
    logger.info("=== 石川県猫保護施設 動的スクレイピングテスト ===")
    
    # 実際に存在するURL群をテスト
    target_urls = [
        "https://www.pref.ishikawa.lg.jp/yakuji/doubutsu/hogoinuneko.html",  # 犬猫の保護情報
        "https://www.pref.ishikawa.lg.jp/minamikaga/toppage/seikatu/inunekojyouto.html",  # 犬猫の譲渡情報
        "https://www.pref.ishikawa.lg.jp/shisetsu/08/0270.html"  # いしかわ動物愛護センター
    ]
    
    all_cats = []
    cat_keywords = ['猫', 'ネコ', 'ねこ', '保護', '譲渡', '里親', '収容', '期限', '処分', '引取り', '飼い主募集']
    
    # 各URLをテスト
    for i, target_url in enumerate(target_urls, 1):
        logger.info(f"\n--- URL {i}/{len(target_urls)}: {target_url} ---")
        
        # Step 1: 静的取得テスト
        logger.info(f"Step 1: 静的HTTP取得 (URL {i})")
        static_cats = []
        static_html = ""
        
        try:
            response = requests.get(target_url, timeout=15)
            response.raise_for_status()
            static_html = response.text
            logger.info(f"静的HTML取得完了: {len(static_html)} 文字")
            
            # 猫関連キーワードの検索
            static_keyword_count = 0
            
            for keyword in cat_keywords:
                count = static_html.count(keyword)
                static_keyword_count += count
                if count > 0:
                    logger.info(f"静的HTML: '{keyword}' が {count} 回出現")
            
            logger.info(f"静的HTML総キーワード数: {static_keyword_count}")
            
            # 静的HTMLから猫情報抽出
            if static_html:
                static_soup = BeautifulSoup(static_html, 'lxml')
                static_cats = local_extractor.extract_from_html(static_soup, target_url)
                logger.info(f"静的抽出結果: {len(static_cats)} 匹")
                
                # 抽出された猫の詳細表示
                for j, cat in enumerate(static_cats[:3], 1):
                    logger.info(f"静的猫{j}: {cat.get('name', '名前不明')} - {cat.get('gender', '性別不明')} - {cat.get('color', '色不明')}")
            
        except Exception as e:
            logger.error(f"静的取得エラー: {e}")
            logger.info("静的取得に失敗しましたが、動的取得を続行します")
    
        # Step 2: 動的取得テスト（Playwright）
        logger.info(f"Step 2: Playwright動的取得 (URL {i})")
        dynamic_cats = []
        
        try:
            with sync_playwright() as p:
                # ブラウザ起動オプション
                browser_args = {
                    "headless": True,
                    "args": [
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-blink-features=AutomationControlled",
                        "--disable-extensions",
                        "--disable-gpu",
                        "--disable-web-security",
                        "--allow-running-insecure-content",
                        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    ]
                }
                
                # プロキシ設定
                https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
                if https_proxy:
                    browser_args["proxy"] = {"server": https_proxy}
                    logger.info(f"プロキシ使用: {https_proxy}")
                else:
                    logger.info("プロキシなしで動作")
                
                browser = p.chromium.launch(**browser_args)
                context = browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                page = context.new_page()
                
                logger.info("ページに移動中...")
                try:
                    # より寛容なタイムアウト設定
                    page.goto(target_url, wait_until='domcontentloaded', timeout=45000)
                    logger.info("初期ページロード完了")
                    
                    # ネットワーク待機
                    page.wait_for_load_state('networkidle', timeout=30000)
                    logger.info("ネットワーク待機完了")
                    
                    # JavaScript実行完了待機
                    page.wait_for_timeout(5000)
                    logger.info("JavaScript実行待機完了")
                    
                    # ページタイトル確認
                    title = page.title()
                    logger.info(f"ページタイトル: {title}")
                    
                    # 現在のURL確認（リダイレクトの可能性）
                    current_url = page.url
                    logger.info(f"現在のURL: {current_url}")
                    
                    # 動的コンテンツ読み込み待機
                    try:
                        # 猫関連のコンテンツが読み込まれるまで待機
                        page.wait_for_function(
                            """() => {
                                const content = document.body.innerText;
                                return content.includes('猫') || content.includes('ネコ') || content.includes('ねこ');
                            }""",
                            timeout=10000
                        )
                        logger.info("猫関連コンテンツの読み込み確認")
                    except Exception as e:
                        logger.warning(f"猫関連コンテンツ待機タイムアウト: {e}")
                    
                    # 追加のスクロール処理（遅延読み込み対応）
                    logger.info("ページをスクロールして遅延読み込みコンテンツを取得")
                    page.evaluate("""() => {
                        window.scrollTo(0, document.body.scrollHeight);
                    }""")
                    page.wait_for_timeout(2000)
                    
                    # レンダリング後のHTML取得
                    dynamic_html = page.content()
                    logger.info(f"動的HTML取得完了: {len(dynamic_html)} 文字")
                    
                    # 動的HTMLでキーワード検索
                    dynamic_keyword_count = 0
                    for keyword in cat_keywords:
                        count = dynamic_html.count(keyword)
                        dynamic_keyword_count += count
                        if count > 0:
                            logger.info(f"動的HTML: '{keyword}' が {count} 回出現")
                    
                    logger.info(f"動的HTML総キーワード数: {dynamic_keyword_count}")
                    
                    # 動的HTMLから猫情報抽出
                    dynamic_soup = BeautifulSoup(dynamic_html, 'lxml')
                    dynamic_cats = local_extractor.extract_from_html(dynamic_soup, current_url)
                    logger.info(f"動的抽出結果: {len(dynamic_cats)} 匹")
                    
                    # 抽出された猫の詳細表示
                    for j, cat in enumerate(dynamic_cats[:3], 1):
                        logger.info(f"動的猫{j}: {cat.get('name', '名前不明')} - {cat.get('gender', '性別不明')} - {cat.get('color', '色不明')}")
                    
                    # ページ構造分析
                    logger.info("=== ページ構造分析 ===")
                    
                    # テーブル要素の検索
                    tables = dynamic_soup.find_all('table')
                    logger.info(f"テーブル要素数: {len(tables)}")
                    
                    # フォーム要素の検索
                    forms = dynamic_soup.find_all('form')
                    logger.info(f"フォーム要素数: {len(forms)}")
                    
                    # 画像要素の検索
                    images = dynamic_soup.find_all('img')
                    logger.info(f"画像要素数: {len(images)}")
                    
                    # JavaScript含有量
                    scripts = dynamic_soup.find_all('script')
                    logger.info(f"スクリプト要素数: {len(scripts)}")
                    
                    # リンク要素の検索（猫関連ページへのリンク）
                    links = dynamic_soup.find_all('a', href=True)
                    cat_links = []
                    for link in links:
                        href = link.get('href', '')
                        text = link.get_text().strip()
                        if any(keyword in text.lower() for keyword in ['猫', 'ねこ', 'ネコ', '保護', '譲渡']) or \
                           any(keyword in href.lower() for keyword in ['cat', 'neko', 'adoption', 'pet']):
                            full_url = urljoin(current_url, href)
                            cat_links.append((text, full_url))
                    
                    logger.info(f"猫関連リンク数: {len(cat_links)}")
                    for j, (text, url) in enumerate(cat_links[:3], 1):
                        logger.info(f"リンク{j}: {text[:50]} -> {url}")
                    
                    # 現在のページに画像がある場合、最初の数枚を表示
                    if images:
                        logger.info("=== 画像情報 ===")
                        for j, img in enumerate(images[:3], 1):
                            src = img.get('src', '')
                            alt = img.get('alt', '')
                            if src:
                                full_src = urljoin(current_url, src)
                                logger.info(f"画像{j}: {alt} - {full_src}")
                    
                except Exception as e:
                    logger.error(f"ページ処理エラー: {e}")
                    # エラーが発生してもHTMLを取得試行
                    try:
                        dynamic_html = page.content()
                        logger.info(f"エラー後HTML取得: {len(dynamic_html)} 文字")
                    except:
                        logger.error("HTML取得も失敗")
                
                finally:
                    browser.close()
            
            # 比較結果の表示
            logger.info(f"=== 比較結果 (URL {i}) ===")
            
            if static_html and dynamic_html:
                improvement_size = len(dynamic_html) - len(static_html)
                improvement_keywords = dynamic_keyword_count - static_keyword_count
                improvement_cats = len(dynamic_cats) - len(static_cats)
                
                logger.info(f"HTML文字数: 静的 {len(static_html)} → 動的 {len(dynamic_html)} (差分: {improvement_size:+d})")
                logger.info(f"キーワード数: 静的 {static_keyword_count} → 動的 {dynamic_keyword_count} (差分: {improvement_keywords:+d})")
                logger.info(f"抽出猫数: 静的 {len(static_cats)} → 動的 {len(dynamic_cats)} (差分: {improvement_cats:+d})")
                
                if improvement_cats > 0:
                    logger.info("✅ 動的取得で追加の猫を発見！")
                elif improvement_keywords > 0:
                    logger.info("✅ 動的取得でコンテンツ増加を確認")
                elif improvement_size > 0:
                    logger.info("✅ 動的取得でHTML増加を確認")
                else:
                    logger.info("⚠️ 動的取得での大きな改善なし")
            else:
                logger.info(f"動的取得のみの結果: {len(dynamic_cats)} 匹")
                logger.info(f"動的HTML: {len(dynamic_html)} 文字")
                logger.info(f"動的キーワード数: {dynamic_keyword_count}")
            
            # 結果をまとめる
            final_cats = dynamic_cats if dynamic_cats else static_cats
            all_cats.extend(final_cats)
            logger.info(f"URL {i} から {len(final_cats)} 匹を追加")
            
        except Exception as e:
            logger.error(f"動的取得エラー (URL {i}): {e}")
            # 静的取得の結果があれば使用
            all_cats.extend(static_cats)
    
    # 最終的な猫情報の詳細表示
    logger.info("=== 全URL の最終抽出結果 ===")
    logger.info(f"利用可能な猫の総数: {len(all_cats)} 匹")
    
    for i, cat in enumerate(all_cats[:10], 1):
        logger.info(f"猫{i}: {cat.get('name', '名前不明')} | {cat.get('gender', '性別不明')} | {cat.get('color', '色不明')} | {cat.get('age_estimate', '年齢不明')}")
        if cat.get('images'):
            logger.info(f"  画像: {len(cat['images'])} 枚")
        if cat.get('special_needs'):
            logger.info(f"  備考: {cat['special_needs'][:100]}")
    
    return all_cats

if __name__ == "__main__":
    cats = test_ishikawa_cat_shelter_dynamic()
    print(f"\n=== 最終結果 ===")
    print(f"石川県猫保護施設から {len(cats)} 匹の猫情報を取得しました")
    
    if cats:
        print("\n取得された猫情報:")
        for i, cat in enumerate(cats[:5], 1):
            print(f"{i}. {cat.get('name', '名前不明')} ({cat.get('gender', '性別不明')}, {cat.get('color', '色不明')})")
            if cat.get('images'):
                print(f"   画像: {len(cat['images'])} 枚")
    else:
        print("猫情報が見つかりませんでした。")