"""
Health Monitor for Tail Match Scraper
スクレイピングシステムの健康状態監視
"""

import os
import json
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional
from database import db

logger = logging.getLogger(__name__)

class HealthMonitor:
    """スクレイピングシステムの健康状態監視クラス"""
    
    def __init__(self):
        self.status_file = Path('scraper_status.json')
        self.heartbeat_file = Path('scraper_heartbeat.txt')
        self.max_idle_hours = 25  # 24時間+1時間のバッファ
        self.max_error_rate = 0.5  # 50%以上の失敗は問題
        
    def update_heartbeat(self, status: str = 'running', details: str = None):
        """ハートビート更新"""
        try:
            heartbeat_data = {
                'timestamp': datetime.now().isoformat(),
                'status': status,
                'details': details or '',
                'pid': os.getpid(),
                'hostname': os.uname().nodename if hasattr(os, 'uname') else 'unknown'
            }
            
            with open(self.heartbeat_file, 'w', encoding='utf-8') as f:
                f.write(f"{heartbeat_data['timestamp']}\n")
                f.write(f"STATUS: {status}\n")
                f.write(f"PID: {heartbeat_data['pid']}\n")
                if details:
                    f.write(f"DETAILS: {details}\n")
            
            logger.debug(f"Heartbeat updated: {status}")
            
        except Exception as e:
            logger.error(f"Failed to update heartbeat: {e}")

    def check_system_health(self) -> Dict[str, Any]:
        """システム全体の健康状態をチェック"""
        health_status = {
            'overall_status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'checks': {}
        }
        
        # 1. データベース接続チェック
        db_status = self._check_database_health()
        health_status['checks']['database'] = db_status
        
        # 2. 最近のスクレイピング結果チェック
        scraping_status = self._check_recent_scraping()
        health_status['checks']['scraping'] = scraping_status
        
        # 3. ハートビートチェック
        heartbeat_status = self._check_heartbeat()
        health_status['checks']['heartbeat'] = heartbeat_status
        
        # 4. ディスク容量チェック
        disk_status = self._check_disk_space()
        health_status['checks']['disk'] = disk_status
        
        # 5. システムリソースチェック
        resource_status = self._check_system_resources()
        health_status['checks']['resources'] = resource_status
        
        # 総合判定
        failed_checks = [name for name, check in health_status['checks'].items() 
                        if check['status'] != 'healthy']
        
        if failed_checks:
            health_status['overall_status'] = 'unhealthy'
            health_status['failed_checks'] = failed_checks
        
        # ステータスファイルに保存
        self._save_status(health_status)
        
        return health_status

    def _check_database_health(self) -> Dict[str, Any]:
        """データベースの健康状態チェック"""
        try:
            if db.test_connection():
                # 最近のスクレイピングログも確認
                recent_logs = db.get_recent_scraping_logs(hours=24)
                return {
                    'status': 'healthy',
                    'message': f'Database connected, {len(recent_logs)} recent logs',
                    'connection': True,
                    'recent_logs_count': len(recent_logs)
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': 'Database connection failed',
                    'connection': False
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Database error: {str(e)}',
                'connection': False,
                'error': str(e)
            }

    def _check_recent_scraping(self) -> Dict[str, Any]:
        """最近のスクレイピング状況チェック"""
        try:
            # 過去24時間のスクレイピング結果を取得
            recent_logs = db.get_recent_scraping_logs(hours=24)
            
            if not recent_logs:
                return {
                    'status': 'warning',
                    'message': 'No scraping activity in last 24 hours',
                    'last_activity': None,
                    'total_scrapes': 0
                }
            
            # 成功率を計算
            total_scrapes = len(recent_logs)
            successful_scrapes = sum(1 for log in recent_logs if log.get('status') == 'success')
            success_rate = successful_scrapes / total_scrapes if total_scrapes > 0 else 0
            
            # 最新の活動時刻
            latest_log = max(recent_logs, key=lambda x: x.get('completed_at', datetime.min))
            latest_time = latest_log.get('completed_at')
            
            status = 'healthy'
            if success_rate < self.max_error_rate:
                status = 'unhealthy'
            elif total_scrapes < 1:  # 1日1回は最低限実行されるべき
                status = 'warning'
            
            return {
                'status': status,
                'message': f'{successful_scrapes}/{total_scrapes} successful scrapes',
                'success_rate': success_rate,
                'total_scrapes': total_scrapes,
                'successful_scrapes': successful_scrapes,
                'last_activity': latest_time.isoformat() if latest_time else None
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Error checking scraping logs: {str(e)}',
                'error': str(e)
            }

    def _check_heartbeat(self) -> Dict[str, Any]:
        """ハートビートファイルの確認"""
        try:
            if not self.heartbeat_file.exists():
                return {
                    'status': 'warning',
                    'message': 'No heartbeat file found',
                    'file_exists': False
                }
            
            # ファイルの最終更新時刻を確認
            mtime = datetime.fromtimestamp(self.heartbeat_file.stat().st_mtime)
            age_hours = (datetime.now() - mtime).total_seconds() / 3600
            
            with open(self.heartbeat_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            status = 'healthy'
            if age_hours > self.max_idle_hours:
                status = 'unhealthy'
            elif age_hours > 12:  # 12時間以上は警告
                status = 'warning'
            
            return {
                'status': status,
                'message': f'Last heartbeat: {age_hours:.1f} hours ago',
                'last_update': mtime.isoformat(),
                'age_hours': age_hours,
                'content_preview': content[:200]
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Error reading heartbeat: {str(e)}',
                'error': str(e)
            }

    def _check_disk_space(self) -> Dict[str, Any]:
        """ディスク容量チェック"""
        try:
            import shutil
            total, used, free = shutil.disk_usage('.')
            
            free_gb = free / (1024**3)
            total_gb = total / (1024**3)
            usage_percent = (used / total) * 100
            
            status = 'healthy'
            if free_gb < 1:  # 1GB未満は危険
                status = 'unhealthy'
            elif free_gb < 5:  # 5GB未満は警告
                status = 'warning'
            
            return {
                'status': status,
                'message': f'{free_gb:.1f}GB free ({usage_percent:.1f}% used)',
                'free_gb': free_gb,
                'total_gb': total_gb,
                'usage_percent': usage_percent
            }
            
        except Exception as e:
            return {
                'status': 'warning',
                'message': f'Could not check disk space: {str(e)}',
                'error': str(e)
            }

    def _check_system_resources(self) -> Dict[str, Any]:
        """システムリソースチェック（メモリ、CPU）"""
        try:
            import psutil
            
            # メモリ使用率
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # CPU使用率（1秒間の平均）
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # 負荷平均（Linuxの場合）
            load_avg = None
            try:
                load_avg = os.getloadavg()
            except (AttributeError, OSError):
                pass
            
            status = 'healthy'
            warnings = []
            
            if memory_percent > 90:
                status = 'unhealthy'
                warnings.append(f'High memory usage: {memory_percent:.1f}%')
            elif memory_percent > 80:
                status = 'warning'
                warnings.append(f'Memory usage: {memory_percent:.1f}%')
            
            if cpu_percent > 90:
                if status != 'unhealthy':
                    status = 'warning'
                warnings.append(f'High CPU usage: {cpu_percent:.1f}%')
            
            message = ', '.join(warnings) if warnings else f'Memory: {memory_percent:.1f}%, CPU: {cpu_percent:.1f}%'
            
            result = {
                'status': status,
                'message': message,
                'memory_percent': memory_percent,
                'cpu_percent': cpu_percent
            }
            
            if load_avg:
                result['load_average'] = load_avg
            
            return result
            
        except ImportError:
            return {
                'status': 'warning',
                'message': 'psutil not available for resource monitoring',
                'psutil_available': False
            }
        except Exception as e:
            return {
                'status': 'warning',
                'message': f'Error checking system resources: {str(e)}',
                'error': str(e)
            }

    def _save_status(self, status: Dict[str, Any]):
        """ステータスをファイルに保存"""
        try:
            with open(self.status_file, 'w', encoding='utf-8') as f:
                json.dump(status, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save status file: {e}")

    def get_simple_status(self) -> str:
        """シンプルなステータス文字列を返す（ログ用）"""
        try:
            health = self.check_system_health()
            overall = health['overall_status']
            
            if overall == 'healthy':
                return "✅ System healthy"
            elif overall == 'warning':
                warnings = [name for name, check in health['checks'].items() 
                           if check['status'] == 'warning']
                return f"⚠️ System warning: {', '.join(warnings)}"
            else:
                failures = [name for name, check in health['checks'].items() 
                           if check['status'] == 'unhealthy']
                return f"🚨 System unhealthy: {', '.join(failures)}"
                
        except Exception as e:
            return f"❌ Health check failed: {str(e)}"

    def emergency_notification(self, message: str):
        """緊急通知（将来的にSlackやメール連携）"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        emergency_log = f"[EMERGENCY {timestamp}] {message}\n"
        
        # 緊急ログファイルに記録
        with open('emergency.log', 'a', encoding='utf-8') as f:
            f.write(emergency_log)
        
        # 標準ログにも記録
        logger.critical(f"EMERGENCY: {message}")
        
        # 将来的にはここでSlackやメール通知を送信
        print(f"🚨 EMERGENCY: {message}")


# グローバルモニターインスタンス
health_monitor = HealthMonitor()