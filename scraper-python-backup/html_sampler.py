"""
HTML Sample Storage System for Tail Match
スクレイピング用HTMLサンプル保存・管理システム
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class HTMLSampler:
    """HTMLサンプル保存・管理クラス"""
    
    def __init__(self, base_dir: str = None):
        if base_dir is None:
            base_dir = os.path.join(os.path.dirname(__file__), 'html_samples')
        
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        
        # メタデータファイル
        self.metadata_file = self.base_dir / 'metadata.json'
        self.load_metadata()
        
        logger.info(f"HTML Sampler initialized: {self.base_dir}")
    
    def load_metadata(self):
        """メタデータを読み込み"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {}
        except Exception as e:
            logger.error(f"Failed to load metadata: {e}")
            self.metadata = {}
    
    def save_metadata(self):
        """メタデータを保存"""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
    
    def save_html_sample(self, url: str, html_content: str, municipality_id: int,
                        cats_found: int = 0, extraction_successful: bool = False) -> str:
        """HTMLサンプルを保存（0件の日も重要なテストケースとして保存）"""
        
        # ファイル名を生成（URL + タイムスタンプ）
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        url_safe = self._make_filename_safe(url)
        sample_type = "success" if extraction_successful else "zero"
        filename = f"{municipality_id:03d}_{url_safe}_{sample_type}_{timestamp}.html"
        filepath = self.base_dir / filename
        
        try:
            # HTMLファイルを保存
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # メタデータを更新
            sample_info = {
                'url': url,
                'municipality_id': municipality_id,
                'timestamp': timestamp,
                'datetime': datetime.now().isoformat(),
                'filename': filename,
                'cats_found': cats_found,
                'extraction_successful': extraction_successful,
                'file_size': len(html_content),
                'html_length': len(html_content),
                'sample_type': 'success' if extraction_successful else 'zero_cats'
            }
            
            # URL別のサンプル履歴を管理
            if url not in self.metadata:
                self.metadata[url] = []
            
            self.metadata[url].append(sample_info)
            
            # バランス良くサンプルを保持（成功例と0件例の両方を保持）
            self._balance_samples(url)
            
            self.save_metadata()
            
            logger.info(f"HTML sample saved: {filename} (cats: {cats_found}, type: {sample_info['sample_type']})")
            return str(filepath)
            
        except Exception as e:
            logger.error(f"Failed to save HTML sample: {e}")
            return None
    
    def get_successful_samples(self, url: str = None, municipality_id: int = None) -> List[Dict[str, Any]]:
        """成功したサンプルを取得"""
        successful_samples = []
        
        for sample_url, samples in self.metadata.items():
            if url and url != sample_url:
                continue
            
            for sample in samples:
                if municipality_id and sample.get('municipality_id') != municipality_id:
                    continue
                
                if sample.get('extraction_successful') and sample.get('cats_found', 0) > 0:
                    successful_samples.append(sample)
        
        # 新しい順でソート
        successful_samples.sort(key=lambda x: x.get('datetime', ''), reverse=True)
        return successful_samples
    
    def load_sample_html(self, filename: str) -> Optional[str]:
        """サンプルHTMLを読み込み"""
        try:
            filepath = self.base_dir / filename
            if not filepath.exists():
                logger.error(f"Sample file not found: {filename}")
                return None
            
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to load sample HTML: {e}")
            return None
    
    def create_test_case(self, url: str, municipality_id: int = None) -> Optional[Dict[str, Any]]:
        """成功サンプルからテストケースを作成"""
        successful_samples = self.get_successful_samples(url, municipality_id)
        
        if not successful_samples:
            logger.warning(f"No successful samples found for {url}")
            return None
        
        # 最新の成功サンプルを使用
        latest_sample = successful_samples[0]
        html_content = self.load_sample_html(latest_sample['filename'])
        
        if not html_content:
            return None
        
        return {
            'url': url,
            'municipality_id': latest_sample['municipality_id'],
            'sample_date': latest_sample['datetime'],
            'html_content': html_content,
            'expected_cats': latest_sample['cats_found'],
            'metadata': latest_sample
        }
    
    def run_regression_test(self, extractor_func, url: str = None) -> Dict[str, Any]:
        """リグレッションテストを実行（成功例と0件例の両方をテスト）"""
        results = {
            'total_tests': 0,
            'passed': 0,
            'failed': 0,
            'false_positives': 0,
            'failures': []
        }
        
        # テスト対象のサンプルを取得
        test_urls = [url] if url else list(self.metadata.keys())
        
        for test_url in test_urls:
            # 成功例のテスト
            successful_samples = self.get_successful_samples(test_url)
            
            for sample in successful_samples:
                results['total_tests'] += 1
                
                try:
                    # HTMLを読み込み
                    html_content = self.load_sample_html(sample['filename'])
                    if not html_content:
                        continue
                    
                    # 抽出を実行
                    soup = BeautifulSoup(html_content, 'lxml')
                    extracted_cats = extractor_func(soup, test_url)
                    
                    # 結果を比較
                    expected_count = sample.get('cats_found', 0)
                    actual_count = len(extracted_cats)
                    
                    if actual_count >= expected_count:  # 以前と同等以上の結果
                        results['passed'] += 1
                        logger.info(f"✅ Success test passed: {sample['filename']} (expected: {expected_count}, actual: {actual_count})")
                    else:
                        results['failed'] += 1
                        failure_info = {
                            'sample': sample['filename'],
                            'url': test_url,
                            'expected': expected_count,
                            'actual': actual_count,
                            'date': sample['datetime'],
                            'test_type': 'success_regression'
                        }
                        results['failures'].append(failure_info)
                        logger.error(f"❌ Success test failed: {sample['filename']} (expected: {expected_count}, actual: {actual_count})")
                
                except Exception as e:
                    results['failed'] += 1
                    failure_info = {
                        'sample': sample['filename'],
                        'url': test_url,
                        'error': str(e),
                        'date': sample['datetime'],
                        'test_type': 'success_error'
                    }
                    results['failures'].append(failure_info)
                    logger.error(f"❌ Success test error: {sample['filename']} - {e}")
            
            # 0件例のテスト（false positive チェック）
            zero_samples = self.get_zero_samples(test_url)
            
            for sample in zero_samples:
                results['total_tests'] += 1
                
                try:
                    # HTMLを読み込み
                    html_content = self.load_sample_html(sample['filename'])
                    if not html_content:
                        continue
                    
                    # 抽出を実行
                    soup = BeautifulSoup(html_content, 'lxml')
                    extracted_cats = extractor_func(soup, test_url)
                    
                    # 0件であることを確認
                    actual_count = len(extracted_cats)
                    
                    if actual_count == 0:  # 正しく0件を検出
                        results['passed'] += 1
                        logger.info(f"✅ Zero test passed: {sample['filename']} (correctly detected 0 cats)")
                    else:
                        results['failed'] += 1
                        results['false_positives'] += 1
                        failure_info = {
                            'sample': sample['filename'],
                            'url': test_url,
                            'expected': 0,
                            'actual': actual_count,
                            'date': sample['datetime'],
                            'test_type': 'false_positive'
                        }
                        results['failures'].append(failure_info)
                        logger.error(f"❌ False positive detected: {sample['filename']} (expected: 0, actual: {actual_count})")
                
                except Exception as e:
                    results['failed'] += 1
                    failure_info = {
                        'sample': sample['filename'],
                        'url': test_url,
                        'error': str(e),
                        'date': sample['datetime'],
                        'test_type': 'zero_error'
                    }
                    results['failures'].append(failure_info)
                    logger.error(f"❌ Zero test error: {sample['filename']} - {e}")
        
        logger.info(f"Regression test completed: {results['passed']}/{results['total_tests']} passed, {results['false_positives']} false positives")
        return results
    
    def _make_filename_safe(self, url: str) -> str:
        """URLをファイル名に安全な形式に変換"""
        import re
        # ドメイン部分を抽出
        domain_match = re.search(r'https?://([^/]+)', url)
        if domain_match:
            domain = domain_match.group(1)
            domain = re.sub(r'[^\w\-.]', '_', domain)
            return domain
        else:
            safe_url = re.sub(r'[^\w\-.]', '_', url)
            return safe_url[:50]  # 長すぎる場合は切り詰め
    
    def _balance_samples(self, url: str):
        """サンプルをバランス良く保持（成功例と0件例の両方）"""
        samples = self.metadata[url]
        
        # 成功例と0件例を分類
        success_samples = [s for s in samples if s.get('extraction_successful')]
        zero_samples = [s for s in samples if not s.get('extraction_successful')]
        
        # 成功例は最大7件、0件例は最大3件保持
        success_samples.sort(key=lambda x: x['datetime'], reverse=True)
        zero_samples.sort(key=lambda x: x['datetime'], reverse=True)
        
        kept_success = success_samples[:7]
        kept_zero = zero_samples[:3]
        
        # 削除対象を特定
        to_remove = success_samples[7:] + zero_samples[3:]
        
        # ファイルを削除
        for sample in to_remove:
            filepath = self.base_dir / sample['filename']
            if filepath.exists():
                filepath.unlink()
        
        # メタデータを更新
        self.metadata[url] = kept_success + kept_zero

    def get_zero_samples(self, url: str = None, municipality_id: int = None) -> List[Dict[str, Any]]:
        """0件のサンプルを取得（false positive テスト用）"""
        zero_samples = []
        
        for sample_url, samples in self.metadata.items():
            if url and url != sample_url:
                continue
            
            for sample in samples:
                if municipality_id and sample.get('municipality_id') != municipality_id:
                    continue
                
                if not sample.get('extraction_successful') and sample.get('cats_found', 0) == 0:
                    zero_samples.append(sample)
        
        # 新しい順でソート
        zero_samples.sort(key=lambda x: x.get('datetime', ''), reverse=True)
        return zero_samples

    def cleanup_old_samples(self, days_to_keep: int = 30):
        """古いサンプルをクリーンアップ（バランス重視）"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        for url, samples in list(self.metadata.items()):
            # 成功例と0件例を分類
            success_samples = [s for s in samples if s.get('extraction_successful')]
            zero_samples = [s for s in samples if not s.get('extraction_successful')]
            
            # 新しいものから保持
            success_samples.sort(key=lambda x: x['datetime'], reverse=True)
            zero_samples.sort(key=lambda x: x['datetime'], reverse=True)
            
            # 成功例は長期保持、0件例は中期保持
            kept_success = success_samples[:10]  # 成功例は多めに保持
            kept_zero = [s for s in zero_samples[:5] 
                        if datetime.fromisoformat(s['datetime']) > cutoff_date // 2]  # 0件例は半分の期間
            
            # 削除対象
            to_remove = success_samples[10:] + zero_samples[5:]
            
            # 古い0件例も削除
            for sample in zero_samples[:5]:
                if datetime.fromisoformat(sample['datetime']) <= cutoff_date // 2:
                    to_remove.append(sample)
            
            # ファイルを削除
            for sample in to_remove:
                filepath = self.base_dir / sample['filename']
                if filepath.exists():
                    filepath.unlink()
                    logger.info(f"Removed old sample: {sample['filename']}")
            
            kept_samples = kept_success + kept_zero
            if kept_samples:
                self.metadata[url] = kept_samples
            else:
                del self.metadata[url]
        
        self.save_metadata()
        logger.info("Sample cleanup completed")

# グローバルサンプラーインスタンス
html_sampler = HTMLSampler()