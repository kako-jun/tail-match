#!/usr/bin/env python3
"""
シンプルなPlaywrightテスト
"""

import logging

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_playwright_installation():
    """Playwrightインストール確認"""
    logger.info("=== Playwrightインストール確認 ===")
    
    # Step 1: インポート確認
    try:
        from playwright.sync_api import sync_playwright
        logger.info("✅ Playwright正常にインポート")
    except ImportError as e:
        logger.error(f"❌ Playwrightインポートエラー: {e}")
        return False
    
    # Step 2: 基本動作確認
    try:
        logger.info("ブラウザ起動テスト開始...")
        with sync_playwright() as p:
            logger.info("Playwrightコンテキスト作成成功")
            
            # Chromiumブラウザ起動
            browser = p.chromium.launch(headless=True)
            logger.info("Chromiumブラウザ起動成功")
            
            # 新しいページ作成
            page = browser.new_page()
            logger.info("新しいページ作成成功")
            
            # シンプルなページに移動
            page.goto("https://example.com")
            logger.info("example.comに移動成功")
            
            # タイトル取得
            title = page.title()
            logger.info(f"ページタイトル: {title}")
            
            # ページ内容取得
            content = page.content()
            logger.info(f"ページ内容長: {len(content)} chars")
            
            browser.close()
            logger.info("✅ ブラウザ正常終了")
            
        logger.info("✅ Playwright動作確認完了")
        return True
        
    except Exception as e:
        logger.error(f"❌ Playwright動作エラー: {e}")
        return False

def test_ishikawa_site():
    """石川県サイト簡易テスト"""
    logger.info("=== 石川県サイト簡易テスト ===")
    
    try:
        from playwright.sync_api import sync_playwright
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # より確実な石川県関連サイト
            test_url = "https://www.pref.ishikawa.lg.jp/douai/top.html"
            logger.info(f"テスト対象: {test_url}")
            
            page.goto(test_url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(3000)
            
            title = page.title()
            content = page.content()
            
            logger.info(f"ページタイトル: {title}")
            logger.info(f"コンテンツ長: {len(content)} chars")
            
            # 保護猫関連キーワード検索
            keywords = ['猫', 'ネコ', 'ねこ', '保護', '譲渡', '里親', '動物']
            for keyword in keywords:
                count = content.count(keyword)
                if count > 0:
                    logger.info(f"キーワード '{keyword}': {count} 回出現")
            
            browser.close()
            logger.info("✅ 石川県サイトテスト完了")
            
    except Exception as e:
        logger.error(f"❌ 石川県サイトテストエラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if test_playwright_installation():
        test_ishikawa_site()
    else:
        logger.error("Playwrightセットアップが必要です")