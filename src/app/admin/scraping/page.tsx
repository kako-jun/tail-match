'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Container,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab'
import {
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Pets as PetsIcon,
  TrendingUp as TrendingUpIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material'

interface ScrapingLog {
  id: number
  municipality_name: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  tails_found: number
  tails_added: number
  tails_updated: number
  tails_removed: number
  error_message: string | null
  execution_time_ms: number | null
}

interface ScrapingStats {
  total_runs: number
  successful_runs: number
  failed_runs: number
  total_cats_found: number
  avg_execution_time: number
  last_run: string | null
}

export default function ScrapingAdminPage() {
  const [logs, setLogs] = useState<ScrapingLog[]>([])
  const [stats, setStats] = useState<ScrapingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch scraping logs
      const logsResponse = await fetch('/api/admin/scraping/logs')
      if (!logsResponse.ok) {
        throw new Error('Failed to fetch scraping logs')
      }
      const logsData = await logsResponse.json()
      setLogs(logsData)

      // Fetch scraping statistics
      const statsResponse = await fetch('/api/admin/scraping/stats')
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch scraping stats')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      
      // Set mock data for development
      setLogs([
        {
          id: 1,
          municipality_name: 'いしかわ動物愛護センター',
          started_at: '2025-07-01T00:29:00Z',
          completed_at: '2025-07-01T00:29:45Z',
          status: 'completed',
          tails_found: 20,
          tails_added: 3,
          tails_updated: 2,
          tails_removed: 1,
          error_message: '⚠️ 検出された猫はフォールバック抽出（実際の猫データなし、JavaScript必須）',
          execution_time_ms: 45000
        },
        {
          id: 2,
          municipality_name: '金沢市動物愛護管理センター',
          started_at: '2025-07-01T00:30:00Z',
          completed_at: '2025-07-01T00:30:30Z',
          status: 'completed',
          tails_found: 4,
          tails_added: 1,
          tails_updated: 0,
          tails_removed: 0,
          error_message: '⚠️ 検出された猫はフォールバック抽出（実際の猫データなし、JavaScript必須）',
          execution_time_ms: 30000
        },
        {
          id: 3,
          municipality_name: 'いしかわ動物愛護センター (Playwright)',
          started_at: '2025-07-01T00:31:00Z',
          completed_at: '2025-07-01T00:32:15Z',
          status: 'completed',
          tails_found: 42,
          tails_added: 12,
          tails_updated: 5,
          tails_removed: 2,
          error_message: null,
          execution_time_ms: 75000
        }
      ])
      
      setStats({
        total_runs: 15,
        successful_runs: 12,
        failed_runs: 3,
        total_cats_found: 198,
        avg_execution_time: 52000,
        last_run: '2025-07-01T00:32:15Z'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'failed': return 'error'
      case 'running': return 'warning'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <SuccessIcon />
      case 'failed': return <ErrorIcon />
      case 'running': return <ScheduleIcon />
      default: return <ScheduleIcon />
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`
    }
    return `${seconds}秒`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          スクレイピング管理画面
        </Typography>
        <Typography>読み込み中...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon color="primary" />
          スクレイピング管理画面
        </Typography>
        <Tooltip title="データを更新">
          <IconButton onClick={fetchData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          API接続エラー（開発用モックデータを表示中）: {error}
        </Alert>
      )}

      {/* 統計カード */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon color="primary" />
                  <Typography color="textSecondary" gutterBottom>
                    総実行回数
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {stats.total_runs}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <SuccessIcon color="success" />
                  <Typography color="textSecondary" gutterBottom>
                    成功率
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {Math.round((stats.successful_runs / stats.total_runs) * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <PetsIcon color="secondary" />
                  <Typography color="textSecondary" gutterBottom>
                    発見猫総数
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {stats.total_cats_found}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <ScheduleIcon color="info" />
                  <Typography color="textSecondary" gutterBottom>
                    平均実行時間
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatDuration(stats.avg_execution_time)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* スクレイピング履歴タイムライン */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon />
          スクレイピング履歴
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Timeline>
          {logs.map((log, index) => (
            <TimelineItem key={log.id}>
              <TimelineOppositeContent color="text.secondary">
                {formatDateTime(log.started_at)}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={getStatusColor(log.status) as any}>
                  {getStatusIcon(log.status)}
                </TimelineDot>
                {index < logs.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3">
                      {log.municipality_name}
                    </Typography>
                    <Chip 
                      label={log.status === 'completed' ? '完了' : log.status === 'failed' ? '失敗' : '実行中'}
                      color={getStatusColor(log.status) as any}
                      size="small"
                    />
                  </Box>

                  {log.status === 'completed' && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">
                          発見数
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {log.tails_found}匹
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">
                          新規追加
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          +{log.tails_added}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">
                          更新
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          {log.tails_updated}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">
                          実行時間
                        </Typography>
                        <Typography variant="h6">
                          {log.execution_time_ms ? formatDuration(log.execution_time_ms) : '-'}
                        </Typography>
                      </Grid>
                    </Grid>
                  )}

                  {log.error_message && (
                    <Alert 
                      severity={log.error_message.includes('フォールバック') ? 'warning' : 'error'} 
                      sx={{ mt: 2 }}
                    >
                      {log.error_message}
                    </Alert>
                  )}
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>

        {logs.length === 0 && (
          <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
            スクレイピング履歴がありません
          </Typography>
        )}
      </Paper>
    </Container>
  )
}