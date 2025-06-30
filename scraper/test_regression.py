#!/usr/bin/env python3
"""
Regression Test Runner for Tail Match Scraper
スクレイピング抽出機能のリグレッションテストランナー
"""

import sys
import os
import logging
from datetime import datetime

# パスを追加
sys.path.insert(0, os.path.dirname(__file__))

from html_sampler import html_sampler
from local_extractor import local_extractor
from ishikawa_scraper import IshikawaScraper

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def run_local_extractor_tests():
    """ローカル抽出システムのリグレッションテスト"""
    print("=== Local Extractor Regression Tests ===\n")
    
    def test_extractor(soup, url):
        return local_extractor.extract_from_html(soup, url)
    
    results = html_sampler.run_regression_test(test_extractor)
    
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    
    if results['failures']:
        print("\n❌ Failures:")
        for failure in results['failures']:
            print(f"  - {failure['sample']}: expected {failure.get('expected', 'N/A')}, got {failure.get('actual', 'N/A')}")
            if 'error' in failure:
                print(f"    Error: {failure['error']}")
    
    if results['passed'] == results['total_tests'] and results['total_tests'] > 0:
        print("\n🎉 All regression tests passed!")
        
        # 安全性チェックの追加レポート
        if 'false_positives' in results and results['false_positives'] > 0:
            print(f"⚠️  However, {results['false_positives']} false positives detected")
            print("   This means the extractor is finding cats where there should be none")
        
        return True
    elif results['total_tests'] == 0:
        print("\n⚠️  No regression tests available (no successful HTML samples saved yet)")
        print("\n🚨 SAFETY CONCERN: Without regression tests, we cannot verify extraction accuracy")
        print("   This could lead to missed cats or false positives")
        return None
    else:
        print(f"\n❌ {results['failed']}/{results['total_tests']} tests failed")
        
        # 失敗の内容を分析
        success_failures = sum(1 for f in results['failures'] if f.get('test_type') == 'success_regression')
        false_positive_failures = sum(1 for f in results['failures'] if f.get('test_type') == 'false_positive')
        
        if success_failures > 0:
            print(f"🚨 CRITICAL: {success_failures} success regression failures - cats may be missed!")
        if false_positive_failures > 0:
            print(f"⚠️  WARNING: {false_positive_failures} false positive failures - phantom cats detected")
        
        return False

def list_saved_samples():
    """保存されたHTMLサンプルの一覧を表示"""
    print("=== Saved HTML Samples ===\n")
    
    if not html_sampler.metadata:
        print("No HTML samples saved yet.")
        print("\nTo collect samples:")
        print("1. Run scrapers with actual municipality websites")
        print("2. When cats are found and successfully extracted, HTML will be saved automatically")
        return
    
    total_samples = 0
    successful_samples = 0
    
    for url, samples in html_sampler.metadata.items():
        print(f"URL: {url}")
        print(f"  Total samples: {len(samples)}")
        
        successful = [s for s in samples if s.get('extraction_successful')]
        if successful:
            print(f"  Successful samples: {len(successful)}")
            latest = max(successful, key=lambda x: x.get('datetime', ''))
            print(f"  Latest successful: {latest['datetime']} ({latest['cats_found']} cats)")
            successful_samples += len(successful)
        else:
            print(f"  ⚠️  No successful extractions yet")
        
        total_samples += len(samples)
        print()
    
    print(f"Summary: {successful_samples}/{total_samples} successful samples")

def create_test_case_example():
    """テストケース作成の例を表示"""
    print("=== Test Case Creation Example ===\n")
    
    successful_samples = html_sampler.get_successful_samples()
    
    if not successful_samples:
        print("No successful samples available for test case creation.")
        return
    
    sample = successful_samples[0]
    print(f"Example successful sample:")
    print(f"  URL: {sample.get('url', 'N/A')}")
    print(f"  Date: {sample.get('datetime', 'N/A')}")
    print(f"  Cats found: {sample.get('cats_found', 0)}")
    print(f"  Municipality ID: {sample.get('municipality_id', 'N/A')}")
    
    # テストケースを作成
    test_case = html_sampler.create_test_case(sample['url'])
    if test_case:
        print(f"\n✅ Test case created successfully")
        print(f"  Expected cats: {test_case['expected_cats']}")
        print(f"  HTML length: {len(test_case['html_content'])} characters")
    else:
        print(f"\n❌ Failed to create test case")

def cleanup_old_samples():
    """古いサンプルのクリーンアップ"""
    print("=== Cleaning Up Old Samples ===\n")
    
    before_count = sum(len(samples) for samples in html_sampler.metadata.values())
    
    html_sampler.cleanup_old_samples(days_to_keep=30)
    
    after_count = sum(len(samples) for samples in html_sampler.metadata.values())
    
    removed_count = before_count - after_count
    print(f"Cleaned up {removed_count} old samples")
    print(f"Remaining samples: {after_count}")

def main():
    """メイン関数"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'test':
            result = run_local_extractor_tests()
            sys.exit(0 if result else 1)
        elif command == 'list':
            list_saved_samples()
        elif command == 'example':
            create_test_case_example()
        elif command == 'cleanup':
            cleanup_old_samples()
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
    else:
        # デフォルト: 全ての機能を実行
        print("🔍 Tail Match Scraper - Regression Test Suite\n")
        
        list_saved_samples()
        print()
        
        result = run_local_extractor_tests()
        print()
        
        create_test_case_example()
        
        print("\n" + "="*50)
        print("Next steps:")
        print("1. Run scrapers to collect HTML samples:")
        print("   python main.py --municipality 1 --type ishikawa")
        print("2. Run regression tests:")
        print("   python test_regression.py test")
        print("3. List saved samples:")
        print("   python test_regression.py list")

if __name__ == '__main__':
    main()