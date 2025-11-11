#!/usr/bin/env python3
"""
石川県動的サイト実地テスト（データベースなし）
"""

import logging
import requests
from bs4 import BeautifulSoup
from local_extractor import local_extractor

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_ishikawa_static_vs_dynamic():
    """石川県サイトの静的vs動的比較"""
    logger.info("=== 石川県動的サイト実地テスト ===")
    
    # いしかわ動物愛護センター
    target_url = "https://www.pref.ishikawa.lg.jp/douai/douti.html"
    
    logger.info(f"テスト対象URL: {target_url}")
    
    # Step 1: 静的取得
    logger.info("Step 1: 静的HTTP取得")
    try:
        response = requests.get(target_url, timeout=10)
        static_html = response.text
        logger.info(f"静的HTML取得: {len(static_html)} chars")
        
        # 猫関連キーワード検索
        cat_keywords = ['猫', 'ネコ', 'ねこ', '保護', '譲渡', '里親', '収容']
        static_mentions = 0
        for keyword in cat_keywords:
            count = static_html.count(keyword)
            static_mentions += count
            if count > 0:
                logger.info(f"静的HTML: '{keyword}' が {count} 回出現")
        
        logger.info(f"静的HTML総キーワード数: {static_mentions}")
        
        # 静的HTMLで猫情報抽出
        static_soup = BeautifulSoup(static_html, 'lxml')
        static_cats = local_extractor.extract_from_html(static_soup, target_url)
        logger.info(f"静的抽出結果: {len(static_cats)} 匹")
        
        for i, cat in enumerate(static_cats[:3], 1):
            logger.info(f"静的猫{i}: {cat.get('name', '名前不明')} ({cat.get('gender', '性別不明')})")
        
    except Exception as e:
        logger.error(f"静的取得エラー: {e}")
        return
    
    # Step 2: 動的取得（Playwright）
    logger.info("Step 2: Playwright動的取得")
    try:
        from playwright.sync_api import sync_playwright
        import os
        
        with sync_playwright() as p:
            # プロキシ設定
            browser_args = {"headless": True}
            
            https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
            if https_proxy:
                browser_args["proxy"] = {"server": https_proxy}
                logger.info(f"プロキシ使用: {https_proxy}")
            else:
                logger.info("プロキシなしで動作")
            
            browser = p.chromium.launch(**browser_args)
            page = browser.new_page()
            
            logger.info("ページに移動中...")
            page.goto(target_url, wait_until='networkidle', timeout=30000)
            
            logger.info("JavaScript実行完了を待機中...")
            page.wait_for_timeout(5000)
            
            # レンダリング後のHTML取得
            dynamic_html = page.content()
            browser.close()
            
            logger.info(f"動的HTML取得: {len(dynamic_html)} chars")
            
            # 動的HTMLで猫関連キーワード検索
            dynamic_mentions = 0
            for keyword in cat_keywords:
                count = dynamic_html.count(keyword)
                dynamic_mentions += count
                if count > 0:
                    logger.info(f"動的HTML: '{keyword}' が {count} 回出現")
            
            logger.info(f"動的HTML総キーワード数: {dynamic_mentions}")
            
            # 動的HTMLで猫情報抽出
            dynamic_soup = BeautifulSoup(dynamic_html, 'lxml')
            dynamic_cats = local_extractor.extract_from_html(dynamic_soup, target_url)
            logger.info(f"動的抽出結果: {len(dynamic_cats)} 匹")
            
            for i, cat in enumerate(dynamic_cats[:3], 1):
                logger.info(f"動的猫{i}: {cat.get('name', '名前不明')} ({cat.get('gender', '性別不明')})")
            
            # 比較結果
            improvement_keywords = dynamic_mentions - static_mentions
            improvement_cats = len(dynamic_cats) - len(static_cats)
            
            logger.info(f"=== 比較結果 ===")
            logger.info(f"キーワード改善: +{improvement_keywords}")
            logger.info(f"猫数改善: +{improvement_cats}")
            
            if improvement_cats > 0:
                logger.info("✅ 動的取得で追加の猫を発見！")
            elif improvement_keywords > 0:
                logger.info("✅ 動的取得でコンテンツ増加を確認")
            else:
                logger.info("⚠️ 動的取得での大きな改善なし")
        
    except Exception as e:
        logger.error(f"動的取得エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ishikawa_static_vs_dynamic()