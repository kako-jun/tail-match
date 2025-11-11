#!/usr/bin/env python3
"""
プロキシなしでPlaywrightテスト
"""

import os
import logging

# プロキシ設定を無効化
os.environ.pop('HTTP_PROXY', None)
os.environ.pop('HTTPS_PROXY', None)
os.environ.pop('http_proxy', None)
os.environ.pop('https_proxy', None)

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_playwright_basic():
    """基本的なPlaywrightテスト"""
    logger.info("=== プロキシなしPlaywrightテスト ===")
    
    try:
        from playwright.sync_api import sync_playwright
        
        with sync_playwright() as p:
            logger.info("Playwrightコンテキスト作成")
            
            # ブラウザ起動時にプロキシを明示的に無効化
            browser = p.chromium.launch(
                headless=True,
                args=['--no-proxy-server', '--disable-proxy', '--disable-background-networking']
            )
            logger.info("ブラウザ起動成功")
            
            page = browser.new_page()
            logger.info("ページ作成成功")
            
            # シンプルなHTMLページで テスト
            html_content = """
            <html>
            <head><title>テストページ</title></head>
            <body>
                <h1>保護猫情報</h1>
                <div class="cat-info">
                    <p>名前: たま</p>
                    <p>性別: メス</p>
                    <p>色: 三毛</p>
                </div>
            </body>
            </html>
            """
            
            page.set_content(html_content)
            logger.info("HTMLコンテンツ設定成功")
            
            title = page.title()
            content = page.content()
            
            logger.info(f"ページタイトル: {title}")
            logger.info(f"コンテンツ長: {len(content)} chars")
            
            # 猫情報の抽出テスト
            cat_name = page.locator("text=名前:").text_content()
            logger.info(f"抽出した情報: {cat_name}")
            
            browser.close()
            logger.info("✅ テスト完了")
            return True
            
    except Exception as e:
        logger.error(f"❌ テストエラー: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_playwright_basic()