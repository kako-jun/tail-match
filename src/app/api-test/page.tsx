'use client'

import { useState, useEffect } from 'react'
import ScrapingDashboard from '@/components/ScrapingDashboard'

interface ApiTestResult {
  endpoint: string
  status: 'pending' | 'success' | 'error'
  response?: any
  error?: string
}

export default function ApiTestPage() {
  const [results, setResults] = useState<ApiTestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const testEndpoints = [
    { name: 'Database Connection', endpoint: '/api/test-db' },
    { name: 'Regions List', endpoint: '/api/regions' },
    { name: 'Municipalities List', endpoint: '/api/municipalities' },
    { name: 'Tails Statistics', endpoint: '/api/tails?stats=true' },
    { name: 'All Tails', endpoint: '/api/tails?limit=5' },
    { name: 'Urgent Tails', endpoint: '/api/tails/urgent?limit=3' },
    { name: 'Scraping Logs', endpoint: '/api/scraping-logs?limit=10' },
    { name: 'Scraping Stats', endpoint: '/api/scraping-stats' },
  ]

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    for (const test of testEndpoints) {
      const result: ApiTestResult = {
        endpoint: test.endpoint,
        status: 'pending'
      }
      
      setResults(prev => [...prev, result])

      try {
        const response = await fetch(test.endpoint)
        const data = await response.json()

        if (response.ok) {
          result.status = 'success'
          result.response = data
        } else {
          result.status = 'error'
          result.error = data.message || data.error || 'Unknown error'
        }
      } catch (error) {
        result.status = 'error'
        result.error = error instanceof Error ? error.message : 'Network error'
      }

      setResults(prev => prev.map(r => 
        r.endpoint === test.endpoint ? result : r
      ))

      // 次のテストまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const getStatusColor = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-urgent-yellow'
      case 'success': return 'text-green-600'
      case 'error': return 'text-urgent-red'
      default: return 'text-calico-black'
    }
  }

  const getStatusIcon = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'success': return '✅'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold text-calico-brown mb-6">API動作テスト</h1>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`btn-primary ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRunning ? 'テスト実行中...' : 'APIテストを実行'}
        </button>
      </div>

      <div className="space-y-4">
        {testEndpoints.map((test, index) => {
          const result = results.find(r => r.endpoint === test.endpoint)
          const status = result?.status || 'pending'
          
          return (
            <div key={test.endpoint} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-calico-brown">
                  {getStatusIcon(status)} {test.name}
                </h3>
                <span className={`text-sm ${getStatusColor(status)}`}>
                  {status.toUpperCase()}
                </span>
              </div>
              
              <p className="text-sm text-denim mb-2">
                <code>{test.endpoint}</code>
              </p>

              {result?.error && (
                <div className="bg-urgent-red text-white p-3 rounded text-sm">
                  <strong>エラー:</strong> {result.error}
                </div>
              )}

              {result?.response && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-calico-brown hover:underline">
                    レスポンス詳細を表示
                  </summary>
                  <pre className="mt-2 p-3 bg-calico-cream rounded text-xs overflow-auto">
                    {JSON.stringify(result.response, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )
        })}
      </div>

      {results.length === 0 && (
        <div className="card text-center">
          <p className="text-calico-black">
            「APIテストを実行」ボタンをクリックしてテストを開始してください。
          </p>
        </div>
      )}

      <div className="mt-8 card">
        <h2 className="text-xl font-bold text-calico-brown mb-4">📝 テスト項目</h2>
        <ul className="space-y-2 text-sm">
          <li><strong>Database Connection:</strong> PostgreSQL接続確認</li>
          <li><strong>Regions List:</strong> 都道府県一覧取得</li>
          <li><strong>Municipalities List:</strong> 自治体一覧取得</li>
          <li><strong>Tails Statistics:</strong> 統計情報取得</li>
          <li><strong>All Tails:</strong> 尻尾ちゃん一覧取得</li>
          <li><strong>Urgent Tails:</strong> 緊急度の高い尻尾ちゃん取得</li>
          <li><strong>Scraping Logs:</strong> スクレイピング履歴取得</li>
          <li><strong>Scraping Stats:</strong> スクレイピング統計情報取得</li>
        </ul>
      </div>

      {/* スクレイピングダッシュボード */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-calico-brown mb-6">📊 スクレイピングダッシュボード</h2>
        <ScrapingDashboard />
      </div>
    </div>
  )
}