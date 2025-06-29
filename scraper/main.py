#!/usr/bin/env python3
"""
Tail Match Scraper Main Entry Point
メインスクレイピング実行スクリプト
"""

import sys
import logging
import argparse
from datetime import datetime
from typing import List
from config import config
from database import db
from test_scraper import TestScraper, SimpleScraper

# ログ設定
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scraper.log') if hasattr(logging, 'FileHandler') else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

def test_database_connection() -> bool:
    """データベース接続テスト"""
    logger.info("Testing database connection...")
    
    try:
        if db.test_connection():
            logger.info("✅ Database connection successful")
            return True
        else:
            logger.error("❌ Database connection failed")
            return False
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        return False

def run_single_scraper(municipality_id: int, scraper_type: str = 'test') -> bool:
    """単一自治体のスクレイピングを実行"""
    logger.info(f"Running {scraper_type} scraper for municipality {municipality_id}")
    
    try:
        # スクレイパーを選択
        if scraper_type == 'test':
            scraper = TestScraper(municipality_id)
        elif scraper_type == 'simple':
            scraper = SimpleScraper(municipality_id)
        else:
            logger.error(f"Unknown scraper type: {scraper_type}")
            return False
        
        # スクレイピング実行
        result = scraper.scrape()
        
        # 結果を表示
        if result.success:
            logger.info(f"✅ Scraping successful:")
            logger.info(f"   Found: {result.tails_found} tails")
            logger.info(f"   Added: {result.tails_added} tails")
            logger.info(f"   Removed: {result.tails_removed} tails")
            logger.info(f"   Execution time: {result.execution_time_ms}ms")
            return True
        else:
            logger.error(f"❌ Scraping failed:")
            for error in result.errors:
                logger.error(f"   Error: {error}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Scraper execution failed: {e}")
        return False

def run_all_scrapers(scraper_type: str = 'test') -> None:
    """全自治体のスクレイピングを実行"""
    logger.info(f"Running {scraper_type} scrapers for all active municipalities")
    
    try:
        municipalities = db.get_active_municipalities()
        logger.info(f"Found {len(municipalities)} active municipalities")
        
        success_count = 0
        total_count = len(municipalities)
        
        for municipality in municipalities:
            municipality_id = municipality['id']
            municipality_name = municipality['name']
            
            logger.info(f"Processing {municipality_name} (ID: {municipality_id})")
            
            if run_single_scraper(municipality_id, scraper_type):
                success_count += 1
                logger.info(f"✅ {municipality_name} completed successfully")
            else:
                logger.error(f"❌ {municipality_name} failed")
        
        logger.info(f"Batch scraping completed: {success_count}/{total_count} successful")
        
    except Exception as e:
        logger.error(f"❌ Batch scraping failed: {e}")

def list_municipalities() -> None:
    """アクティブな自治体一覧を表示"""
    try:
        municipalities = db.get_active_municipalities()
        
        print("\n=== Active Municipalities ===")
        for municipality in municipalities:
            print(f"ID: {municipality['id']:3d} | {municipality['region_name']} | {municipality['name']}")
            if municipality['website_url']:
                print(f"      URL: {municipality['website_url']}")
            print()
        
        print(f"Total: {len(municipalities)} municipalities")
        
    except Exception as e:
        logger.error(f"Failed to list municipalities: {e}")

def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description='Tail Match Scraper')
    parser.add_argument('--test-db', action='store_true', help='Test database connection')
    parser.add_argument('--list', action='store_true', help='List active municipalities')
    parser.add_argument('--municipality', type=int, help='Run scraper for specific municipality ID')
    parser.add_argument('--all', action='store_true', help='Run scrapers for all municipalities')
    parser.add_argument('--type', choices=['test', 'simple'], default='test', 
                       help='Scraper type (default: test)')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (test only, no data changes)')
    
    args = parser.parse_args()
    
    # 設定の妥当性チェック
    if not config.validate():
        logger.error("Invalid configuration. Please check environment variables.")
        sys.exit(1)
    
    logger.info("=== Tail Match Scraper Starting ===")
    logger.info(f"Scraping enabled: {config.SCRAPING_ENABLED}")
    logger.info(f"Interval: {config.SCRAPING_INTERVAL_SECONDS} seconds")
    
    # データベース接続テスト
    if args.test_db or not args.municipality and not args.all and not args.list:
        if not test_database_connection():
            sys.exit(1)
        if args.test_db:
            return
    
    # 自治体一覧表示
    if args.list:
        list_municipalities()
        return
    
    # スクレイピング無効時の警告
    if not config.SCRAPING_ENABLED and not args.dry_run:
        logger.warning("⚠️  Scraping is disabled in configuration")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            logger.info("Scraping cancelled by user")
            return
    
    # 単一自治体のスクレイピング
    if args.municipality:
        success = run_single_scraper(args.municipality, args.type)
        sys.exit(0 if success else 1)
    
    # 全自治体のスクレイピング
    if args.all:
        run_all_scrapers(args.type)
        return
    
    # デフォルト: 使用方法を表示
    parser.print_help()

if __name__ == '__main__':
    main()