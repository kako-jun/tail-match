#!/usr/bin/env python3
"""
Statistics Dashboard for Tail Match Scraper
スクレイピング統計・監視ダッシュボード
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any
from database import db
from health_monitor import health_monitor

class StatsDashboard:
    """統計ダッシュボードAPI（Next.js用データ提供）"""
    
    def __init__(self):
        self.data = {}
    
    def generate_dashboard_data(self, days: int = 7) -> Dict[str, Any]:
        """ダッシュボード用データを生成"""
        dashboard = {
            'timestamp': datetime.now().isoformat(),
            'period_days': days,
            'health_status': {},
            'scraping_stats': {},
            'daily_charts': {},
            'municipality_stats': {},
            'recent_activity': {}
        }
        
        # 1. システムヘルス状況
        dashboard['health_status'] = self._get_health_status()
        
        # 2. スクレイピング統計
        dashboard['scraping_stats'] = self._get_scraping_stats(days)
        
        # 3. 日毎のチャートデータ
        dashboard['daily_charts'] = self._get_daily_charts(days)
        
        # 4. 自治体別統計
        dashboard['municipality_stats'] = self._get_municipality_stats(days)
        
        # 5. 最近の活動ログ
        dashboard['recent_activity'] = self._get_recent_activity()
        
        return dashboard
    
    def _get_health_status(self) -> Dict[str, Any]:
        """システムヘルス状況を取得"""
        try:
            health = health_monitor.check_system_health()
            return {
                'overall_status': health['overall_status'],
                'timestamp': health['timestamp'],
                'checks': health['checks'],
                'failed_checks': health.get('failed_checks', []),
                'simple_status': health_monitor.get_simple_status()
            }
        except Exception as e:
            return {
                'overall_status': 'error',
                'error': str(e),
                'simple_status': f"❌ Health check failed: {str(e)}"
            }
    
    def _get_scraping_stats(self, days: int) -> Dict[str, Any]:
        """スクレイピング統計を取得"""
        try:
            logs = db.get_recent_scraping_logs(hours=days * 24)
            
            if not logs:
                return {
                    'total_scrapes': 0,
                    'success_rate': 0,
                    'total_cats_found': 0,
                    'total_cats_added': 0,
                    'average_execution_time': 0
                }
            
            total_scrapes = len(logs)
            successful_scrapes = sum(1 for log in logs if log.get('status') == 'success')
            success_rate = successful_scrapes / total_scrapes if total_scrapes > 0 else 0
            
            total_cats_found = sum(log.get('tails_found', 0) for log in logs)
            total_cats_added = sum(log.get('tails_added', 0) for log in logs)
            total_cats_removed = sum(log.get('tails_removed', 0) for log in logs)
            
            execution_times = [log.get('execution_time_ms', 0) for log in logs if log.get('execution_time_ms')]
            avg_execution_time = sum(execution_times) / len(execution_times) if execution_times else 0
            
            return {
                'total_scrapes': total_scrapes,
                'successful_scrapes': successful_scrapes,
                'failed_scrapes': total_scrapes - successful_scrapes,
                'success_rate': success_rate,
                'total_cats_found': total_cats_found,
                'total_cats_added': total_cats_added,
                'total_cats_removed': total_cats_removed,
                'average_execution_time': avg_execution_time,
                'period_summary': f"{total_scrapes} scrapes, {total_cats_found} cats found in {days} days"
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _get_daily_charts(self, days: int) -> Dict[str, Any]:
        """日毎のチャートデータを取得"""
        try:
            # 日毎の集計データを取得
            query = """
            SELECT 
                DATE(completed_at) as scrape_date,
                COUNT(*) as total_scrapes,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_scrapes,
                SUM(tails_found) as cats_found,
                SUM(tails_added) as cats_added,
                SUM(tails_removed) as cats_removed,
                AVG(execution_time_ms) as avg_execution_time
            FROM scraping_logs
            WHERE completed_at >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(completed_at)
            ORDER BY scrape_date
            """
            
            daily_data = db.execute_query(query, (days,))
            
            # チャート用のデータ形式に変換
            dates = []
            cats_found = []
            cats_added = []
            cats_removed = []
            success_rates = []
            execution_times = []
            
            for day in daily_data:
                dates.append(day['scrape_date'].strftime('%Y-%m-%d'))
                cats_found.append(day['cats_found'] or 0)
                cats_added.append(day['cats_added'] or 0)
                cats_removed.append(day['cats_removed'] or 0)
                
                # 成功率
                total = day['total_scrapes'] or 1
                success = day['successful_scrapes'] or 0
                success_rates.append((success / total) * 100)
                
                # 実行時間（秒）
                exec_time = day['avg_execution_time'] or 0
                execution_times.append(exec_time / 1000.0)
            
            return {
                'dates': dates,
                'cats_found_daily': cats_found,
                'cats_added_daily': cats_added,
                'cats_removed_daily': cats_removed,
                'success_rate_daily': success_rates,
                'execution_time_daily': execution_times,
                'total_days': len(dates),
                'chart_title': f"Daily Scraping Activity ({days} days)"
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _get_municipality_stats(self, days: int) -> Dict[str, Any]:
        """自治体別統計を取得"""
        try:
            query = """
            SELECT 
                m.name as municipality_name,
                m.id as municipality_id,
                COUNT(sl.id) as total_scrapes,
                SUM(CASE WHEN sl.status = 'success' THEN 1 ELSE 0 END) as successful_scrapes,
                SUM(sl.tails_found) as total_cats_found,
                SUM(sl.tails_added) as total_cats_added,
                MAX(sl.completed_at) as last_scrape
            FROM municipalities m
            LEFT JOIN scraping_logs sl ON m.id = sl.municipality_id 
                AND sl.completed_at >= NOW() - INTERVAL '%s days'
            WHERE m.is_active = true
            GROUP BY m.id, m.name
            ORDER BY total_cats_found DESC NULLS LAST
            """
            
            municipality_data = db.execute_query(query, (days,))
            
            # 統計を計算
            municipalities = []
            for muni in municipality_data:
                total_scrapes = muni['total_scrapes'] or 0
                successful_scrapes = muni['successful_scrapes'] or 0
                success_rate = (successful_scrapes / total_scrapes * 100) if total_scrapes > 0 else 0
                
                municipalities.append({
                    'name': muni['municipality_name'],
                    'id': muni['municipality_id'],
                    'total_scrapes': total_scrapes,
                    'success_rate': success_rate,
                    'cats_found': muni['total_cats_found'] or 0,
                    'cats_added': muni['total_cats_added'] or 0,
                    'last_scrape': muni['last_scrape'].isoformat() if muni['last_scrape'] else None,
                    'status': 'active' if muni['last_scrape'] else 'inactive'
                })
            
            return {
                'municipalities': municipalities,
                'total_municipalities': len(municipalities),
                'active_municipalities': sum(1 for m in municipalities if m['status'] == 'active'),
                'top_performer': municipalities[0] if municipalities else None
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _get_recent_activity(self) -> Dict[str, Any]:
        """最近の活動ログを取得"""
        try:
            recent_logs = db.get_recent_scraping_logs(hours=24)
            
            activities = []
            for log in recent_logs[:20]:  # 最新20件
                activity = {
                    'timestamp': log['completed_at'].isoformat() if log['completed_at'] else None,
                    'municipality': log.get('municipality_name', 'Unknown'),
                    'status': log.get('status', 'unknown'),
                    'cats_found': log.get('tails_found', 0),
                    'cats_added': log.get('tails_added', 0),
                    'execution_time': log.get('execution_time_ms', 0),
                    'error': log.get('error_message')
                }
                activities.append(activity)
            
            return {
                'recent_activities': activities,
                'total_recent': len(activities),
                'last_24h_summary': f"{len(recent_logs)} scrapes in last 24 hours"
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_api_response(self, days: int = 7) -> Dict[str, Any]:
        """Next.js API用のレスポンスを生成"""
        try:
            data = self.generate_dashboard_data(days)
            return {
                'success': True,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def serve_flask_api(self, port: int = 5000):
        """Flask API サーバーを起動（開発用）"""
        try:
            from flask import Flask, jsonify, request
            from flask_cors import CORS
        except ImportError:
            print("Flask not installed. Install with: pip install flask flask-cors")
            return
        
        app = Flask(__name__)
        CORS(app)  # Next.js からのアクセスを許可
        
        @app.route('/api/dashboard')
        def dashboard_api():
            days = request.args.get('days', 7, type=int)
            return jsonify(self.get_api_response(days))
        
        @app.route('/api/health')
        def health_api():
            return jsonify(health_monitor.check_system_health())
        
        @app.route('/api/municipalities')
        def municipalities_api():
            days = request.args.get('days', 7, type=int)
            data = self.generate_dashboard_data(days)
            return jsonify(data.get('municipality_stats', {}))
        
        print(f"🚀 Tail Match API Server starting on http://localhost:{port}")
        print(f"📊 Dashboard API: http://localhost:{port}/api/dashboard")
        print(f"🏥 Health API: http://localhost:{port}/api/health")
        app.run(host='0.0.0.0', port=port, debug=False)

def main():
    """メイン関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Tail Match Statistics API')
    parser.add_argument('--days', type=int, default=7, help='Days to include in statistics')
    parser.add_argument('--format', choices=['json', 'api'], default='json', help='Output format')
    parser.add_argument('--output', help='Output JSON file path')
    parser.add_argument('--serve', action='store_true', help='Start Flask API server')
    parser.add_argument('--port', type=int, default=5000, help='API server port')
    
    args = parser.parse_args()
    
    dashboard = StatsDashboard()
    
    if args.serve:
        # Flask API サーバーを起動
        dashboard.serve_flask_api(args.port)
    elif args.format == 'json':
        # JSON データを出力
        data = dashboard.get_api_response(args.days)
        output = json.dumps(data, ensure_ascii=False, indent=2, default=str)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"Dashboard data saved to {args.output}")
        else:
            print(output)

if __name__ == '__main__':
    main()