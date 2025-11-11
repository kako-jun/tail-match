#!/usr/bin/env python3
"""
Test runner for scraper system
スクレイピングシステムのテスト実行スクリプト
"""

import sys
import os
import logging

# パスを追加
sys.path.insert(0, os.path.dirname(__file__))

from config import config
from database import db
from test_scraper import TestScraper

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def test_basic_functionality():
    """基本機能のテスト"""
    print("=== Tail Match Scraper Test ===\n")
    
    # 1. 設定テスト
    print("1. Configuration Test")
    try:
        print(f"   Database: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
        print(f"   User: {config.DB_USER}")
        print(f"   Scraping Enabled: {config.SCRAPING_ENABLED}")
        print(f"   Interval: {config.SCRAPING_INTERVAL_SECONDS} seconds")
        print("   ✅ Configuration loaded successfully")
    except Exception as e:
        print(f"   ❌ Configuration error: {e}")
        return False
    
    print()
    
    # 2. データベース接続テスト
    print("2. Database Connection Test")
    try:
        if db.test_connection():
            print("   ✅ Database connection successful")
        else:
            print("   ❌ Database connection failed")
            return False
    except Exception as e:
        print(f"   ❌ Database error: {e}")
        return False
    
    print()
    
    # 3. 自治体データ取得テスト
    print("3. Municipality Data Test")
    try:
        municipalities = db.get_active_municipalities()
        print(f"   Found {len(municipalities)} active municipalities")
        
        if municipalities:
            sample = municipalities[0]
            print(f"   Sample: {sample['name']} (ID: {sample['id']})")
            print("   ✅ Municipality data retrieved successfully")
        else:
            print("   ⚠️  No municipalities found")
    except Exception as e:
        print(f"   ❌ Municipality data error: {e}")
        return False
    
    print()
    
    # 4. テストスクレイパー実行
    print("4. Test Scraper Execution")
    try:
        if not municipalities:
            print("   ⚠️  Skipping scraper test (no municipalities)")
            return True
        
        test_municipality_id = municipalities[0]['id']
        scraper = TestScraper(test_municipality_id)
        
        print(f"   Testing with municipality: {municipalities[0]['name']}")
        print("   Running test scraper...")
        
        result = scraper.scrape()
        
        if result.success:
            print(f"   ✅ Scraper execution successful:")
            print(f"      Found: {result.tails_found} tails")
            print(f"      Added: {result.tails_added} tails")
            print(f"      Removed: {result.tails_removed} tails")
            print(f"      Execution time: {result.execution_time_ms}ms")
        else:
            print(f"   ❌ Scraper execution failed:")
            for error in result.errors:
                print(f"      Error: {error}")
            return False
            
    except Exception as e:
        print(f"   ❌ Scraper test error: {e}")
        return False
    
    print()
    
    # 5. データベース確認
    print("5. Database Data Verification")
    try:
        # 追加されたデータを確認
        tails = db.execute_query(
            "SELECT COUNT(*) as count FROM tails WHERE municipality_id = %s",
            (test_municipality_id,)
        )
        
        if tails:
            count = tails[0]['count']
            print(f"   ✅ Found {count} tails in database for test municipality")
        else:
            print("   ⚠️  No tails found in database")
            
    except Exception as e:
        print(f"   ❌ Database verification error: {e}")
        return False
    
    print()
    print("🎉 All tests passed successfully!")
    print("\nNext steps:")
    print("- Configure real municipality websites")
    print("- Implement AI-powered extraction (Phase 2.2)")
    print("- Set up cron jobs for regular scraping")
    
    return True

def show_usage():
    """使用方法を表示"""
    print("\nUsage:")
    print("  python test_run.py              # Run basic functionality test")
    print("  python main.py --test-db        # Test database connection only")
    print("  python main.py --list           # List active municipalities")
    print("  python main.py --municipality 1 # Run scraper for municipality ID 1")
    print("  python main.py --all --type test # Run test scraper for all municipalities")

if __name__ == '__main__':
    try:
        success = test_basic_functionality()
        show_usage()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        sys.exit(1)