'use client';

import { useState } from 'react';
import ScrapingDashboard from '@/components/ScrapingDashboard';
import { Container, Box, Typography, Button, CircularProgress, Chip } from '@mui/material';

interface ApiTestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  response?: any;
  error?: string;
}

export default function ApiTestPage() {
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const testEndpoints = [
    { name: 'Database Connection', endpoint: '/api/test-db' },
    { name: 'Regions List', endpoint: '/api/regions' },
    { name: 'Municipalities List', endpoint: '/api/municipalities' },
    { name: 'Tails Statistics', endpoint: '/api/tails?stats=true' },
    { name: 'All Tails', endpoint: '/api/tails?limit=5' },
    { name: 'Urgent Tails', endpoint: '/api/tails/urgent?limit=3' },
    { name: 'Scraping Logs', endpoint: '/api/scraping-logs?limit=10' },
    { name: 'Scraping Stats', endpoint: '/api/scraping-stats' },
  ];

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    for (const test of testEndpoints) {
      const result: ApiTestResult = {
        endpoint: test.endpoint,
        status: 'pending',
      };

      setResults((prev) => [...prev, result]);

      try {
        const response = await fetch(test.endpoint);
        const data = (await response.json()) as Record<string, any>;

        if (response.ok) {
          result.status = 'success';
          result.response = data;
        } else {
          result.status = 'error';
          result.error = data.message || data.error || 'Unknown error';
        }
      } catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : 'Network error';
      }

      setResults((prev) => prev.map((r) => (r.endpoint === test.endpoint ? result : r)));

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const getStatusChip = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Chip
            label="PENDING"
            size="small"
            sx={{
              backgroundColor: '#FFF8E6',
              color: '#B07D00',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          />
        );
      case 'success':
        return (
          <Chip
            label="SUCCESS"
            size="small"
            sx={{
              backgroundColor: '#F0FFF4',
              color: '#2E7D32',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          />
        );
      case 'error':
        return (
          <Chip
            label="ERROR"
            size="small"
            sx={{
              backgroundColor: '#FFEEF0',
              color: '#ED4956',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          />
        );
      default:
        return <Chip label="UNKNOWN" size="small" sx={{ fontSize: '0.75rem' }} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #DBDBDB' }}>
        <Typography
          sx={{ fontSize: '1.375rem', fontWeight: 300, color: '#262626', letterSpacing: '-0.01em' }}
        >
          API動作テスト
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Button
          onClick={runTests}
          disabled={isRunning}
          variant="contained"
          startIcon={
            isRunning ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : undefined
          }
          sx={{
            backgroundColor: '#262626',
            '&:hover': { backgroundColor: '#000000' },
            '&.Mui-disabled': { backgroundColor: '#8E8E8E', color: '#FFFFFF' },
          }}
        >
          {isRunning ? 'テスト実行中...' : 'APIテストを実行'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {testEndpoints.map((test) => {
          const result = results.find((r) => r.endpoint === test.endpoint);
          const status = result?.status || 'pending';

          return (
            <Box
              key={test.endpoint}
              sx={{
                border: '1px solid #DBDBDB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                p: 2.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#262626' }}>
                  {test.name}
                </Typography>
                {getStatusChip(status)}
              </Box>

              <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', mb: 1 }}>
                <code>{test.endpoint}</code>
              </Typography>

              {result?.error && (
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#FFEEF0',
                    borderRadius: '6px',
                    border: '1px solid #FFBEC2',
                  }}
                >
                  <Typography sx={{ fontSize: '0.8125rem', color: '#ED4956' }}>
                    <strong>エラー:</strong> {result.error}
                  </Typography>
                </Box>
              )}

              {result?.response && (
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: '0.8125rem', color: '#262626' }}>
                    レスポンス詳細を表示
                  </summary>
                  <Box
                    component="pre"
                    sx={{
                      mt: 1,
                      p: 2,
                      backgroundColor: '#F5F5F5',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      border: '1px solid #EFEFEF',
                    }}
                  >
                    {JSON.stringify(result.response, null, 2)}
                  </Box>
                </details>
              )}
            </Box>
          );
        })}
      </Box>

      {results.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            mt: 2,
          }}
        >
          <Typography sx={{ fontSize: '0.9375rem', color: '#8E8E8E' }}>
            「APIテストを実行」ボタンをクリックしてテストを開始してください。
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          mt: 4,
          border: '1px solid #DBDBDB',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          p: 3,
        }}
      >
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626', mb: 2 }}>
          テスト項目
        </Typography>
        <Box
          component="ul"
          sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}
        >
          {[
            { name: 'Database Connection', desc: 'D1データベース接続確認' },
            { name: 'Regions List', desc: '都道府県一覧取得' },
            { name: 'Municipalities List', desc: '自治体一覧取得' },
            { name: 'Tails Statistics', desc: '統計情報取得' },
            { name: 'All Tails', desc: 'シッポたち一覧取得' },
            { name: 'Urgent Tails', desc: '緊急度の高いシッポたち取得' },
            { name: 'Scraping Logs', desc: 'スクレイピング履歴取得' },
            { name: 'Scraping Stats', desc: 'スクレイピング統計情報取得' },
          ].map((item) => (
            <Typography
              key={item.name}
              component="li"
              sx={{ fontSize: '0.8125rem', color: '#8E8E8E' }}
            >
              <strong style={{ color: '#262626' }}>{item.name}:</strong> {item.desc}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* スクレイピングダッシュボード */}
      <Box sx={{ mt: 6 }}>
        <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #DBDBDB' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626' }}>
            スクレイピングダッシュボード
          </Typography>
        </Box>
        <ScrapingDashboard />
      </Box>
    </Container>
  );
}
