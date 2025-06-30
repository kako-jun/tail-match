'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, Activity, Database, TrendingUp } from 'lucide-react'

interface ScrapingLog {
  id: number
  municipality_id: number
  municipality_name: string
  region_name: string
  started_at: string
  completed_at?: string
  status: 'success' | 'error' | 'timeout'
  tails_found: number
  tails_added: number
  tails_updated: number
  tails_removed: number
  error_message?: string
  execution_time_ms?: number
}

interface ScrapingStats {
  totalScrapes: { total: string }
  successRate: { successful: string; total: string; success_rate: string }
  lastScrape: {
    started_at: string
    completed_at?: string
    status: string
    tails_found: number
    tails_added: number
    execution_time_ms?: number
  }
  municipalityStats: Array<{
    municipality_name: string
    region_name: string
    total_scrapes: string
    successful_scrapes: string
    last_scrape: string
    total_tails_found: string
    total_tails_added: string
  }>
}

interface DailyStats {
  date: string
  total_scrapes: string
  successful_scrapes: string
  failed_scrapes: string
  tails_found: string
  tails_added: string
  tails_updated: string
  tails_removed: string
  avg_execution_time: string
}

export default function ScrapingDashboard() {
  const [logs, setLogs] = useState<ScrapingLog[]>([])
  const [stats, setStats] = useState<ScrapingStats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [logsRes, statsRes, dailyRes] = await Promise.all([
        fetch('/api/scraping-logs?limit=20'),
        fetch('/api/scraping-stats'),
        fetch('/api/scraping-stats?type=daily&days=7')
      ])

      if (!logsRes.ok || !statsRes.ok || !dailyRes.ok) {
        throw new Error('APIリクエストが失敗しました')
      }

      const [logsData, statsData, dailyData] = await Promise.all([
        logsRes.json(),
        statsRes.json(),
        dailyRes.json()
      ])

      if (logsData.success) setLogs(logsData.data)
      if (statsData.success) setStats(statsData.data)
      if (dailyData.success) setDailyStats(dailyData.data)

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '不明'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}秒`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'timeout': return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'timeout': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">スクレイピングデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-2">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計サマリー */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総スクレイピング回数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalScrapes.total}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">成功率</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate.success_rate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">最新発見数</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.lastScrape?.tails_found || 0}匹
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">最終実行</p>
                <p className="text-sm font-medium text-gray-900">
                  {stats.lastScrape ? formatDateTime(stats.lastScrape.started_at) : '未実行'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* 日別統計 */}
      {dailyStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">過去7日間の活動</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">日付</th>
                    <th className="text-center py-2">スクレイピング回数</th>
                    <th className="text-center py-2">成功</th>
                    <th className="text-center py-2">失敗</th>
                    <th className="text-center py-2">発見数</th>
                    <th className="text-center py-2">追加数</th>
                    <th className="text-center py-2">平均実行時間</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map((day) => (
                    <tr key={day.date} className="border-b border-gray-100">
                      <td className="py-2">{new Date(day.date).toLocaleDateString('ja-JP')}</td>
                      <td className="text-center py-2">{day.total_scrapes}</td>
                      <td className="text-center py-2 text-green-600">{day.successful_scrapes}</td>
                      <td className="text-center py-2 text-red-600">{day.failed_scrapes}</td>
                      <td className="text-center py-2">{day.tails_found}</td>
                      <td className="text-center py-2 font-medium">{day.tails_added}</td>
                      <td className="text-center py-2">{formatDuration(parseFloat(day.avg_execution_time))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 最新のスクレイピングログ */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">最新のスクレイピングログ</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {logs.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(log.status)}
                  <span className="font-medium text-gray-900">
                    {log.region_name} {log.municipality_name}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                    {log.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDateTime(log.started_at)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">発見:</span>
                  <span className="ml-1 font-medium">{log.tails_found}匹</span>
                </div>
                <div>
                  <span className="text-gray-600">追加:</span>
                  <span className="ml-1 font-medium text-green-600">{log.tails_added}匹</span>
                </div>
                <div>
                  <span className="text-gray-600">更新:</span>
                  <span className="ml-1 font-medium text-blue-600">{log.tails_updated}匹</span>
                </div>
                <div>
                  <span className="text-gray-600">削除:</span>
                  <span className="ml-1 font-medium text-red-600">{log.tails_removed}匹</span>
                </div>
                <div>
                  <span className="text-gray-600">実行時間:</span>
                  <span className="ml-1 font-medium">{formatDuration(log.execution_time_ms)}</span>
                </div>
              </div>
              
              {log.error_message && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                  <strong>エラー:</strong> {log.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}