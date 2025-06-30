"""
Tail Match Scraper Configuration
スクレイピングシステムの設定管理
"""

import os
from typing import Dict, Any
from dotenv import load_dotenv

# 環境変数を読み込み
load_dotenv()

class Config:
    """スクレイピング設定クラス"""
    
    # データベース設定
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://tailmatch_user:dev_password_123@localhost:5432/tailmatch')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '5432'))
    DB_NAME = os.getenv('DB_NAME', 'tailmatch')
    DB_USER = os.getenv('DB_USER', 'tailmatch_user')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'dev_password_123')
    
    # ローカル抽出設定
    EXTRACTION_METHOD = os.getenv('EXTRACTION_METHOD', 'pattern_matching')
    
    # スクレイピング設定
    SCRAPING_ENABLED = os.getenv('SCRAPING_ENABLED', 'false').lower() == 'true'
    SCRAPING_INTERVAL_SECONDS = int(os.getenv('SCRAPING_INTERVAL_SECONDS', '4'))
    MAX_CONCURRENT_SCRAPES = int(os.getenv('MAX_CONCURRENT_SCRAPES', '1'))
    
    # HTTP設定
    USER_AGENT = 'Mozilla/5.0 (compatible; python-requests/2.31.0)'
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    
    # ログ設定
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # ファイルパス設定
    LOGS_DIR = os.path.join(os.path.dirname(__file__), 'logs')
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
    
    @classmethod
    def validate(cls) -> bool:
        """設定の妥当性をチェック"""
        required_settings = [
            cls.DATABASE_URL,
            cls.DB_HOST,
            cls.DB_NAME,
            cls.DB_USER,
            cls.DB_PASSWORD
        ]
        
        missing = [setting for setting in required_settings if not setting]
        if missing:
            print(f"Missing required settings: {missing}")
            return False
            
        return True
    
    @classmethod
    def get_db_config(cls) -> Dict[str, Any]:
        """データベース接続設定を取得"""
        return {
            'host': cls.DB_HOST,
            'port': cls.DB_PORT,
            'database': cls.DB_NAME,
            'user': cls.DB_USER,
            'password': cls.DB_PASSWORD
        }
    
    @classmethod
    def get_scraping_headers(cls) -> Dict[str, str]:
        """スクレイピング用HTTPヘッダーを取得"""
        return {
            'User-Agent': cls.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }

# グローバル設定インスタンス
config = Config()

# 設定バリデーション
if not config.validate():
    raise ValueError("Invalid configuration. Please check environment variables.")

# デバッグ用設定表示
if config.LOG_LEVEL == 'DEBUG':
    print("=== Tail Match Scraper Configuration ===")
    print(f"Database: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
    print(f"Scraping Enabled: {config.SCRAPING_ENABLED}")
    print(f"Interval: {config.SCRAPING_INTERVAL_SECONDS} seconds")
    print(f"Max Concurrent: {config.MAX_CONCURRENT_SCRAPES}")
    print(f"Extraction Method: {config.EXTRACTION_METHOD}")
    print("=" * 40)