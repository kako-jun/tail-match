"""
Database connectivity for Tail Match Scraper
PostgreSQLデータベースとの接続・操作を管理
"""

import psycopg2
import psycopg2.extras
from typing import Dict, List, Any, Optional
import logging
from contextlib import contextmanager
from config import config

# ロガー設定
logger = logging.getLogger(__name__)

class DatabaseManager:
    """データベース接続・操作管理クラス"""
    
    def __init__(self):
        self.db_config = config.get_db_config()
        self._connection_pool = None
    
    @contextmanager
    def get_connection(self):
        """データベース接続のコンテキストマネージャー"""
        conn = None
        try:
            conn = psycopg2.connect(**self.db_config)
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def test_connection(self) -> bool:
        """データベース接続テスト"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    logger.info("Database connection successful")
                    return result[0] == 1
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """クエリ実行（SELECT用）"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                    cursor.execute(query, params)
                    return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """クエリ実行（INSERT/UPDATE/DELETE用）"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    conn.commit()
                    return cursor.rowcount
        except Exception as e:
            logger.error(f"Update execution failed: {e}")
            raise
    
    def get_active_municipalities(self) -> List[Dict[str, Any]]:
        """アクティブな自治体一覧を取得"""
        query = """
        SELECT 
            m.*,
            r.name as region_name,
            r.code as region_code
        FROM municipalities m
        JOIN regions r ON m.region_id = r.id
        WHERE m.is_active = true
        ORDER BY r.code, m.name
        """
        return self.execute_query(query)
    
    def get_municipality_by_id(self, municipality_id: int) -> Optional[Dict[str, Any]]:
        """特定の自治体情報を取得"""
        query = """
        SELECT 
            m.*,
            r.name as region_name,
            r.code as region_code
        FROM municipalities m
        JOIN regions r ON m.region_id = r.id
        WHERE m.id = %s AND m.is_active = true
        """
        results = self.execute_query(query, (municipality_id,))
        return results[0] if results else None
    
    def upsert_tail(self, tail_data: Dict[str, Any]) -> int:
        """尻尾ちゃん情報の挿入・更新"""
        query = """
        INSERT INTO tails (
            municipality_id, external_id, animal_type, name, breed, age_estimate,
            gender, color, size, health_status, personality, special_needs,
            images, protection_date, deadline_date, status, transfer_decided, source_url
        ) VALUES (
            %(municipality_id)s, %(external_id)s, %(animal_type)s, %(name)s, %(breed)s, %(age_estimate)s,
            %(gender)s, %(color)s, %(size)s, %(health_status)s, %(personality)s, %(special_needs)s,
            %(images)s, %(protection_date)s, %(deadline_date)s, %(status)s, %(transfer_decided)s, %(source_url)s
        )
        ON CONFLICT (municipality_id, external_id) 
        DO UPDATE SET
            name = EXCLUDED.name,
            breed = EXCLUDED.breed,
            age_estimate = EXCLUDED.age_estimate,
            gender = EXCLUDED.gender,
            color = EXCLUDED.color,
            size = EXCLUDED.size,
            health_status = EXCLUDED.health_status,
            personality = EXCLUDED.personality,
            special_needs = EXCLUDED.special_needs,
            images = EXCLUDED.images,
            deadline_date = EXCLUDED.deadline_date,
            status = EXCLUDED.status,
            transfer_decided = EXCLUDED.transfer_decided,
            source_url = EXCLUDED.source_url,
            last_scraped_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
        """
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, tail_data)
                    conn.commit()
                    result = cursor.fetchone()
                    tail_id = result[0] if result else None
                    logger.info(f"Upserted tail ID: {tail_id}")
                    return tail_id
        except Exception as e:
            logger.error(f"Failed to upsert tail: {e}")
            raise
    
    def mark_tails_as_removed(self, municipality_id: int, current_external_ids: List[str]) -> int:
        """現在のスクレイピングで見つからなかった猫を削除状態にマーク"""
        if not current_external_ids:
            # 全ての猫を削除対象とする
            query = """
            UPDATE tails 
            SET status = 'removed', updated_at = CURRENT_TIMESTAMP
            WHERE municipality_id = %s AND status = 'available'
            """
            return self.execute_update(query, (municipality_id,))
        else:
            # 見つからなかった猫のみ削除対象
            placeholders = ','.join(['%s'] * len(current_external_ids))
            query = f"""
            UPDATE tails 
            SET status = 'removed', updated_at = CURRENT_TIMESTAMP
            WHERE municipality_id = %s AND status = 'available' 
            AND external_id NOT IN ({placeholders})
            """
            params = (municipality_id,) + tuple(current_external_ids)
            return self.execute_update(query, params)
    
    def log_scraping_result(self, log_data: Dict[str, Any]) -> int:
        """スクレイピング結果をログに記録"""
        query = """
        INSERT INTO scraping_logs (
            municipality_id, started_at, completed_at, status,
            tails_found, tails_added, tails_updated, tails_removed,
            error_message, execution_time_ms
        ) VALUES (
            %(municipality_id)s, %(started_at)s, %(completed_at)s, %(status)s,
            %(tails_found)s, %(tails_added)s, %(tails_updated)s, %(tails_removed)s,
            %(error_message)s, %(execution_time_ms)s
        )
        RETURNING id
        """
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, log_data)
                    conn.commit()
                    result = cursor.fetchone()
                    log_id = result[0] if result else None
                    logger.info(f"Logged scraping result ID: {log_id}")
                    return log_id
        except Exception as e:
            logger.error(f"Failed to log scraping result: {e}")
            raise

# グローバルデータベースマネージャーインスタンス
db = DatabaseManager()