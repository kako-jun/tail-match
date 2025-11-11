#!/usr/bin/env python3
"""
石川県動的サイトテスト
"""

import logging
from universal_scraper import UniversalScraper
from bs4 import BeautifulSoup
import requests

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_ishikawa_dynamic():
    """石川県動的サイトのテスト"""
    logger.info("=== 石川県動的サイトテスト開始 ===")
    
    # いしかわ動物愛護センター（JavaScript使用サイト）
    target_url = "https://www.pref.ishikawa.lg.jp/douai/index.html"
    
    logger.info(f"テスト対象URL: {target_url}")
    
    # 通常のスクレイピングを試す
    logger.info("Step 1: 通常のHTTP取得")
    try:
        response = requests.get(target_url)
        soup = BeautifulSoup(response.content, 'lxml')
        logger.info(f"静的HTML取得成功: {len(str(soup))} bytes")
        
        # JavaScript検出
        js_scripts = soup.find_all('script')
        logger.info(f"Script タグ数: {len(js_scripts)}")
        
        for script in js_scripts[:3]:  # 最初の3つを確認
            if script.get('src'):
                logger.info(f"外部スクリプト: {script.get('src')}")
        
    except Exception as e:
        logger.error(f"静的取得エラー: {e}")
        return
    
    # Universal Scraperでテスト
    logger.info("Step 2: Universal Scraper実行")
    try:
        scraper = UniversalScraper(municipality_id=1)  # 仮のID
        cats = scraper.extract_tail_data(soup, target_url)
        
        logger.info(f"発見した猫の数: {len(cats)}")
        
        for i, cat in enumerate(cats[:3], 1):  # 最初の3匹を表示
            logger.info(f"猫 {i}: {cat.get('name', '名前不明')} ({cat.get('gender', '性別不明')}, {cat.get('color', '色不明')})")
            
    except Exception as e:
        logger.error(f"Universal Scraper エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ishikawa_dynamic()