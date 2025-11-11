#!/usr/bin/env python3
"""
Simple Watchdog for Tail Match Scraper
スクレイピングシステムの簡易監視デーモン
"""

import time
import logging
import sys
from datetime import datetime
from health_monitor import health_monitor

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('watchdog.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def main():
    """メイン監視ループ"""
    logger.info("🐕 Tail Match Watchdog starting...")
    
    check_interval = 300  # 5分間隔でチェック
    consecutive_failures = 0
    max_consecutive_failures = 3  # 3回連続失敗で緊急通知
    
    while True:
        try:
            # ヘルスチェック実行
            health_status = health_monitor.check_system_health()
            overall = health_status['overall_status']
            
            # ステータスログ
            simple_status = health_monitor.get_simple_status()
            logger.info(f"Health check: {simple_status}")
            
            # 状態に応じた処理
            if overall == 'healthy':
                consecutive_failures = 0
                # 定期的なハートビート更新
                health_monitor.update_heartbeat('monitoring', 'Watchdog monitoring - system healthy')
                
            elif overall == 'warning':
                consecutive_failures = 0
                logger.warning(f"System warnings detected: {health_status.get('failed_checks', [])}")
                health_monitor.update_heartbeat('warning', 'Watchdog monitoring - warnings detected')
                
            else:  # unhealthy
                consecutive_failures += 1
                failed_checks = health_status.get('failed_checks', [])
                logger.error(f"System unhealthy (failure #{consecutive_failures}): {failed_checks}")
                
                health_monitor.update_heartbeat('unhealthy', f'System unhealthy: {", ".join(failed_checks)}')
                
                # 連続失敗が閾値を超えたら緊急通知
                if consecutive_failures >= max_consecutive_failures:
                    health_monitor.emergency_notification(
                        f"CRITICAL: System unhealthy for {consecutive_failures} consecutive checks. "
                        f"Failed components: {', '.join(failed_checks)}"
                    )
                    
                    # 緊急通知後は一旦カウンターをリセット（スパム防止）
                    consecutive_failures = 0
            
            # 次のチェックまで待機
            time.sleep(check_interval)
            
        except KeyboardInterrupt:
            logger.info("Watchdog stopped by user")
            health_monitor.update_heartbeat('stopped', 'Watchdog stopped by user')
            break
            
        except Exception as e:
            logger.error(f"Watchdog error: {e}")
            health_monitor.emergency_notification(f"Watchdog error: {e}")
            
            # エラー後は短時間待機してリトライ
            time.sleep(60)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        logger.critical(f"Watchdog crashed: {e}")
        health_monitor.emergency_notification(f"Watchdog crashed: {e}")
        sys.exit(1)