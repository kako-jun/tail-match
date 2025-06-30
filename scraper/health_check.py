#!/usr/bin/env python3
"""
Health Check Tool for Tail Match Scraper
スクレイピングシステムの健康状態チェックツール
"""

import sys
import json
import argparse
from datetime import datetime
from health_monitor import health_monitor

def main():
    parser = argparse.ArgumentParser(description='Tail Match Scraper Health Check')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')
    parser.add_argument('--simple', action='store_true', help='Simple status output')
    parser.add_argument('--emergency-test', action='store_true', help='Test emergency notification')
    
    args = parser.parse_args()
    
    if args.emergency_test:
        health_monitor.emergency_notification("Test emergency notification from health check tool")
        print("Emergency notification test sent")
        return
    
    if args.simple:
        # シンプルなステータス出力（監視システム用）
        status = health_monitor.get_simple_status()
        print(status)
        
        # 終了コードで状態を表現
        if "healthy" in status:
            sys.exit(0)
        elif "warning" in status:
            sys.exit(1)
        else:
            sys.exit(2)
    
    # 詳細なヘルスチェック実行
    health_status = health_monitor.check_system_health()
    
    if args.json:
        # JSON形式で出力
        print(json.dumps(health_status, ensure_ascii=False, indent=2, default=str))
    else:
        # 人間が読みやすい形式で出力
        print_human_readable_status(health_status)
    
    # 終了コードで全体的な状態を表現
    overall = health_status['overall_status']
    if overall == 'healthy':
        sys.exit(0)
    elif overall == 'warning':
        sys.exit(1)
    else:
        sys.exit(2)

def print_human_readable_status(health_status):
    """人間が読みやすい形式でステータスを表示"""
    overall = health_status['overall_status']
    timestamp = health_status['timestamp']
    
    # 全体ステータス
    status_emoji = {
        'healthy': '✅',
        'warning': '⚠️',
        'unhealthy': '🚨'
    }
    
    print(f"{status_emoji.get(overall, '❓')} Overall Status: {overall.upper()}")
    print(f"Check Time: {timestamp}")
    print()
    
    # 各チェック項目の詳細
    checks = health_status['checks']
    
    for check_name, check_result in checks.items():
        status = check_result['status']
        message = check_result['message']
        emoji = status_emoji.get(status, '❓')
        
        print(f"{emoji} {check_name.title()}: {message}")
        
        # 追加の詳細情報があれば表示
        for key, value in check_result.items():
            if key not in ['status', 'message']:
                if key == 'error':
                    print(f"      Error: {value}")
                elif key == 'last_update':
                    print(f"      Last Update: {value}")
                elif key == 'age_hours':
                    print(f"      Age: {value:.1f} hours")
                elif key == 'success_rate':
                    print(f"      Success Rate: {value:.1%}")
                elif key == 'free_gb':
                    print(f"      Free Space: {value:.1f} GB")
        print()
    
    # 失敗したチェックがあれば強調表示
    if 'failed_checks' in health_status:
        failed = health_status['failed_checks']
        print(f"🚨 Failed Checks: {', '.join(failed)}")
        print()
    
    # 推奨アクション
    print("📋 Recommended Actions:")
    if overall == 'healthy':
        print("   ✅ System is running normally")
    elif overall == 'warning':
        print("   ⚠️  Monitor the warning conditions")
        if any('heartbeat' in check for check in checks if checks[check]['status'] == 'warning'):
            print("   📡 Check if scraper process is running")
        if any('disk' in check for check in checks if checks[check]['status'] == 'warning'):
            print("   💾 Consider cleaning up old files")
        if any('memory' in check for check in checks if checks[check]['status'] == 'warning'):
            print("   🔄 Consider restarting the scraper process")
    else:
        print("   🚨 Immediate attention required!")
        if any('database' in check for check in checks if checks[check]['status'] == 'unhealthy'):
            print("   🗄️  Check database connection and service")
        if any('heartbeat' in check for check in checks if checks[check]['status'] == 'unhealthy'):
            print("   💀 Scraper process may be dead - restart required")
        if any('disk' in check for check in checks if checks[check]['status'] == 'unhealthy'):
            print("   💾 Critical disk space - free up space immediately")

if __name__ == '__main__':
    main()