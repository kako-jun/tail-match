#!/usr/bin/env python3
"""
Playwright動的サイトテスト（データベース接続なし）
"""

import logging
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import requests

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_static_vs_dynamic():
    """静的取得と動的取得の比較"""
    logger.info("=== 静的vs動的サイト取得テスト ===")
    
    # いしかわ動物愛護センター
    target_url = "https://www.pref.ishikawa.lg.jp/douai/index.html"
    
    logger.info(f"テスト対象URL: {target_url}")
    
    # Step 1: 静的取得
    logger.info("Step 1: 静的HTTP取得")
    try:
        response = requests.get(target_url, timeout=10)
        static_html = response.text
        logger.info(f"静的HTML取得: {len(static_html)} chars")
        
        # JavaScript検出
        static_soup = BeautifulSoup(static_html, 'lxml')
        script_tags = static_soup.find_all('script')
        logger.info(f"Scriptタグ数: {len(script_tags)}")
        
        # 保護猫関連キーワード検索
        cat_keywords = ['猫', 'ネコ', 'ねこ', '保護', '譲渡', '里親']
        static_cat_mentions = 0
        for keyword in cat_keywords:
            count = static_html.count(keyword)
            static_cat_mentions += count
            if count > 0:
                logger.info(f"静的HTML: '{keyword}' が {count} 回出現")
        
        logger.info(f"静的HTML総キーワード出現数: {static_cat_mentions}")
        
    except Exception as e:
        logger.error(f"静的取得エラー: {e}")
        return
    
    # Step 2: 動的取得（Playwright）
    logger.info("Step 2: Playwright動的取得")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            logger.info("ページに移動中...")
            page.goto(target_url, wait_until='networkidle', timeout=30000)
            
            logger.info("JavaScript実行完了を待機中...")
            page.wait_for_timeout(5000)  # 5秒待機
            
            # レンダリング後のHTML取得
            dynamic_html = page.content()
            browser.close()
            
            logger.info(f"動的HTML取得: {len(dynamic_html)} chars")
            
            # 保護猫関連キーワード検索
            dynamic_cat_mentions = 0
            for keyword in cat_keywords:
                count = dynamic_html.count(keyword)
                dynamic_cat_mentions += count
                if count > 0:
                    logger.info(f"動的HTML: '{keyword}' が {count} 回出現")
            
            logger.info(f"動的HTML総キーワード出現数: {dynamic_cat_mentions}")
            
            # 比較結果
            improvement = dynamic_cat_mentions - static_cat_mentions
            logger.info(f"=== 比較結果 ===")
            logger.info(f"静的HTML文字数: {len(static_html)}")
            logger.info(f"動的HTML文字数: {len(dynamic_html)}")
            logger.info(f"静的キーワード数: {static_cat_mentions}")
            logger.info(f"動的キーワード数: {dynamic_cat_mentions}")
            logger.info(f"改善度: +{improvement} キーワード")
            
            if improvement > 0:
                logger.info("✅ 動的取得で追加情報を発見！")
                
                # 動的HTMLで猫情報抽出を試す
                dynamic_soup = BeautifulSoup(dynamic_html, 'lxml')
                text_content = dynamic_soup.get_text()
                
                # 猫らしき情報を探す
                lines = text_content.split('\n')
                cat_info_lines = []
                for line in lines:
                    line = line.strip()
                    if any(keyword in line for keyword in cat_keywords) and len(line) > 10:
                        cat_info_lines.append(line)
                
                logger.info(f"猫関連情報候補: {len(cat_info_lines)} 行")
                for i, line in enumerate(cat_info_lines[:5], 1):
                    logger.info(f"  {i}: {line[:100]}...")
                    
            else:
                logger.info("⚠️ 動的取得での改善なし")
        
    except Exception as e:
        logger.error(f"動的取得エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_static_vs_dynamic()