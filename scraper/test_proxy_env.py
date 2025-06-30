#!/usr/bin/env python3
"""
プロキシ環境変数テスト
"""

import os
import logging

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_proxy_detection():
    """プロキシ環境変数の検出テスト"""
    logger.info("=== プロキシ環境変数検出テスト ===")
    
    # 環境変数チェック
    https_proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
    http_proxy = os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
    
    logger.info(f"HTTPS_PROXY: {https_proxy}")
    logger.info(f"HTTP_PROXY: {http_proxy}")
    
    # プロキシ設定の決定
    proxies = {}
    if https_proxy:
        proxies['https'] = https_proxy
        logger.info(f"HTTPS プロキシ設定: {https_proxy}")
    if http_proxy:
        proxies['http'] = http_proxy
        logger.info(f"HTTP プロキシ設定: {http_proxy}")
    
    if proxies:
        logger.info(f"プロキシ辞書: {proxies}")
    else:
        logger.info("プロキシ設定なし")
    
    return proxies

def test_requests_with_proxy():
    """requestsでプロキシテスト"""
    logger.info("=== requests プロキシテスト ===")
    
    try:
        import requests
        
        proxies = test_proxy_detection()
        
        session = requests.Session()
        if proxies:
            session.proxies.update(proxies)
            logger.info("requestsセッションにプロキシ設定を適用")
        
        # シンプルなテスト
        response = session.get('https://httpbin.org/ip', timeout=10)
        logger.info(f"レスポンス: {response.json()}")
        logger.info("✅ requests プロキシテスト成功")
        
    except Exception as e:
        logger.error(f"❌ requests プロキシテストエラー: {e}")

if __name__ == "__main__":
    test_proxy_detection()
    test_requests_with_proxy()