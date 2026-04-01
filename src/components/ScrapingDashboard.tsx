'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import {
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as XCircleIcon,
  Speed as ActivityIcon,
  Storage as DatabaseIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

interface ScrapingLog {
  id: number;
  municipality_id: number;
  municipality_name: string;
  region_name: string;
  started_at: string;
  completed_at?: string;
  status: 'success' | 'error' | 'timeout';
  tails_found: number;
  tails_added: number;
  tails_updated: number;
  tails_removed: number;
  error_message?: string;
  execution_time_ms?: number;
}

interface ScrapingStats {
  totalScrapes: { total: string };
  successRate: { successful: string; total: string; success_rate: string };
  lastScrape: {
    started_at: string;
    completed_at?: string;
    status: string;
    tails_found: number;
    tails_added: number;
    execution_time_ms?: number;
  };
  municipalityStats: Array<{
    municipality_name: string;
    region_name: string;
    total_scrapes: string;
    successful_scrapes: string;
    last_scrape: string;
    total_tails_found: string;
    total_tails_added: string;
  }>;
}

interface DailyStats {
  date: string;
  total_scrapes: string;
  successful_scrapes: string;
  failed_scrapes: string;
  tails_found: string;
  tails_added: string;
  tails_updated: string;
  tails_removed: string;
  avg_execution_time: string;
}

const cellSx = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DBDBDB',
  borderRadius: '8px',
  p: 3,
};

export default function ScrapingDashboard() {
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [stats, setStats] = useState<ScrapingStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [logsRes, statsRes, dailyRes] = await Promise.all([
        fetch('/api/scraping-logs?limit=20'),
        fetch('/api/scraping-stats'),
        fetch('/api/scraping-stats?type=daily&days=7'),
      ]);

      if (!logsRes.ok || !statsRes.ok || !dailyRes.ok) {
        throw new Error('APIリクエストが失敗しました');
      }

      const [logsData, statsData, dailyData] = await Promise.all([
        logsRes.json() as Promise<Record<string, any>>,
        statsRes.json() as Promise<Record<string, any>>,
        dailyRes.json() as Promise<Record<string, any>>,
      ]);

      if (logsData.success) setLogs(logsData.data);
      if (statsData.success) setStats(statsData.data);
      if (dailyData.success) setDailyStats(dailyData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('ja-JP');

  const formatDuration = (ms?: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}秒`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 14, color: '#4CAF50' }} />;
      case 'error':
        return <XCircleIcon sx={{ fontSize: 14, color: '#ED4956' }} />;
      case 'timeout':
        return <ClockIcon sx={{ fontSize: 14, color: '#FFBA33' }} />;
      default:
        return <ActivityIcon sx={{ fontSize: 14, color: '#8E8E8E' }} />;
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'success':
        return { background: '#F0FFF4', color: '#1B5E20', border: '1px solid #A5D6A7' };
      case 'error':
        return { background: '#FFEEF0', color: '#B71C1C', border: '1px solid #FFBEC2' };
      case 'timeout':
        return { background: '#FFF8E6', color: '#7A5000', border: '1px solid #FFE299' };
      default:
        return { background: '#F5F5F5', color: '#616161', border: '1px solid #DBDBDB' };
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={24} thickness={2} sx={{ color: '#262626', mb: 2 }} />
          <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
            スクレイピングデータを読み込み中...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          border: '1px solid #FFBEC2',
          borderRadius: '8px',
          backgroundColor: '#FFEEF0',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <XCircleIcon sx={{ fontSize: 16, color: '#ED4956' }} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
            エラーが発生しました
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', mb: 2 }}>{error}</Typography>
        <button
          onClick={fetchData}
          style={{
            background: '#262626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Stats summary */}
      {stats && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
          }}
        >
          {[
            {
              label: '総スクレイピング回数',
              value: stats.totalScrapes.total,
              icon: <DatabaseIcon sx={{ fontSize: 22, color: '#8E8E8E' }} />,
            },
            {
              label: '成功率',
              value: `${stats.successRate.success_rate}%`,
              icon: <TrendingUpIcon sx={{ fontSize: 22, color: '#4CAF50' }} />,
            },
            {
              label: '最新発見数',
              value: `${stats.lastScrape?.tails_found || 0}匹`,
              icon: <ActivityIcon sx={{ fontSize: 22, color: '#FFBA33' }} />,
            },
            {
              label: '最終実行',
              value: stats.lastScrape ? formatDateTime(stats.lastScrape.started_at) : '未実行',
              icon: <ClockIcon sx={{ fontSize: 22, color: '#8E8E8E' }} />,
              small: true,
            },
          ].map((item, i) => (
            <Box key={i} sx={cellSx}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E', lineHeight: 1.4 }}>
                  {item.label}
                </Typography>
                {item.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: item.small ? '0.875rem' : '1.5rem',
                  fontWeight: item.small ? 500 : 300,
                  color: '#262626',
                  lineHeight: 1.2,
                  letterSpacing: item.small ? 0 : '-0.02em',
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Daily stats table */}
      {dailyStats.length > 0 && (
        <Box sx={cellSx}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 2 }}>
            過去7日間の活動
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #DBDBDB' }}>
                  {['日付', 'スクレイピング', '成功', '失敗', '発見数', '追加数', '平均時間'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 12px',
                          textAlign: h === '日付' ? 'left' : 'center',
                          fontWeight: 600,
                          color: '#8E8E8E',
                          whiteSpace: 'nowrap',
                          fontSize: '0.75rem',
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((day) => (
                  <tr key={day.date} style={{ borderBottom: '1px solid #EFEFEF' }}>
                    <td style={{ padding: '10px 12px', color: '#262626' }}>
                      {new Date(day.date).toLocaleDateString('ja-JP')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#262626' }}>
                      {day.total_scrapes}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        color: '#4CAF50',
                        fontWeight: 600,
                      }}
                    >
                      {day.successful_scrapes}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        color: '#ED4956',
                        fontWeight: 600,
                      }}
                    >
                      {day.failed_scrapes}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#262626' }}>
                      {day.tails_found}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        color: '#262626',
                        fontWeight: 600,
                      }}
                    >
                      {day.tails_added}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#8E8E8E' }}>
                      {formatDuration(parseFloat(day.avg_execution_time))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      )}

      {/* Scraping logs */}
      <Box sx={cellSx}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 2 }}>
          最新のスクレイピングログ
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {logs.map((log, i) => (
            <Box
              key={log.id}
              sx={{
                py: 2,
                px: 0,
                borderBottom: i < logs.length - 1 ? '1px solid #EFEFEF' : 'none',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {getStatusIcon(log.status)}
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
                    {log.region_name} {log.municipality_name}
                  </Typography>
                  <span
                    style={{
                      ...getStatusStyle(log.status),
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                    }}
                  >
                    {log.status.toUpperCase()}
                  </span>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
                  {formatDateTime(log.started_at)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: 3,
                  flexWrap: 'wrap',
                  pl: '26px',
                }}
              >
                {[
                  { label: '発見', value: `${log.tails_found}匹`, color: '#262626' },
                  { label: '追加', value: `${log.tails_added}匹`, color: '#4CAF50' },
                  { label: '更新', value: `${log.tails_updated}匹`, color: '#1565C0' },
                  { label: '削除', value: `${log.tails_removed}匹`, color: '#ED4956' },
                  { label: '時間', value: formatDuration(log.execution_time_ms), color: '#8E8E8E' },
                ].map(({ label, value, color }) => (
                  <Box key={label}>
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.75rem', color: '#8E8E8E', mr: 0.5 }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.75rem', color, fontWeight: 600 }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {log.error_message && (
                <Box
                  sx={{
                    mt: 1,
                    ml: '26px',
                    p: 1.5,
                    backgroundColor: '#FFEEF0',
                    borderRadius: '6px',
                    border: '1px solid #FFBEC2',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#B71C1C' }}>
                    <strong>エラー:</strong> {log.error_message}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
