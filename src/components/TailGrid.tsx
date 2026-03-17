'use client'

import { useState, useEffect } from 'react'
import TailCard from './TailCard'
import { TailWithDetails, TailSearchParams } from '@/types/database'
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import { ViewModule, ViewList } from '@mui/icons-material'

interface TailGridProps {
  searchParams?: TailSearchParams
  showUrgentOnly?: boolean
  maxCount?: number
}

interface ApiResponse {
  success: boolean
  data: TailWithDetails[]
  total?: number
  has_more?: boolean
  error?: string
  message?: string
}

export default function TailGrid({
  searchParams = {},
  showUrgentOnly = false,
  maxCount
}: TailGridProps) {
  const [tails, setTails] = useState<TailWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'instagram' | 'card'>('instagram')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const fetchTails = async () => {
      setLoading(true)
      setError(null)

      try {
        let url: string
        let params: URLSearchParams

        if (showUrgentOnly) {
          url = '/api/tails/urgent'
          params = new URLSearchParams()
          if (maxCount) params.set('limit', maxCount.toString())
        } else {
          url = '/api/tails'
          params = new URLSearchParams()

          Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.set(key, value.toString())
            }
          })

          if (maxCount) params.set('limit', maxCount.toString())
        }

        const response = await fetch(`${url}?${params.toString()}`)
        const data: ApiResponse = await response.json()

        if (!response.ok) {
          throw new Error(data.message || data.error || 'APIエラーが発生しました')
        }

        if (data.success) {
          setTails(data.data || [])
        } else {
          throw new Error(data.error || '予期しないエラーが発生しました')
        }

      } catch (err) {
        console.error('Failed to fetch tails:', err)
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchTails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(searchParams), showUrgentOnly, maxCount, retryCount])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress
            size={28}
            thickness={2}
            sx={{ color: '#262626', mb: 2 }}
          />
          <Typography sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>
            シッポたちを探しています...
          </Typography>
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert
          severity="error"
          sx={{
            mb: 2,
            border: '1px solid #FFBEC2',
            backgroundColor: '#FFEEF0',
            borderRadius: '8px',
            '& .MuiAlert-message': { color: '#262626' },
          }}
        >
          <AlertTitle sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
            エラーが発生しました
          </AlertTitle>
          <Typography variant="body2" sx={{ color: '#8E8E8E' }}>{error}</Typography>
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setRetryCount(c => c + 1)}
            sx={{ borderColor: '#DBDBDB', color: '#262626', fontSize: '0.875rem' }}
          >
            再読み込み
          </Button>
        </Box>
      </Box>
    )
  }

  if (tails.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography sx={{ fontSize: '3rem', mb: 2 }}>😿</Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 400, color: '#262626', mb: 1, fontSize: '1rem' }}
        >
          {showUrgentOnly
            ? '緊急のシッポたちは見つかりませんでした'
            : '条件に合うシッポたちが見つかりませんでした'}
        </Typography>
        <Typography sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>
          {showUrgentOnly
            ? '現在、緊急度の高い保護猫はいません。'
            : '検索条件を変更して再度お試しください。'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          pb: 2,
          borderBottom: '1px solid #DBDBDB',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#8E8E8E',
            fontWeight: 400,
          }}
        >
          {showUrgentOnly
            ? `${tails.length}匹の緊急シッポ`
            : `${tails.length}匹のシッポたち`}
        </Typography>

        {/* View mode toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) setViewMode(newMode)
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid #DBDBDB',
              borderRadius: '6px !important',
              padding: '5px 10px',
              '&.Mui-selected': {
                backgroundColor: '#262626',
                color: '#FFFFFF',
                borderColor: '#262626',
              },
            },
          }}
        >
          <ToggleButton value="instagram" aria-label="グリッド表示">
            <ViewModule sx={{ fontSize: 18 }} />
          </ToggleButton>
          <ToggleButton value="card" aria-label="カード表示">
            <ViewList sx={{ fontSize: 18 }} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Instagram photo grid */}
      {viewMode === 'instagram' ? (
        <Box
          sx={{
            display: 'grid',
            gap: '3px',
            gridTemplateColumns: {
              xs: 'repeat(3, 1fr)',
              sm: 'repeat(4, 1fr)',
              md: 'repeat(5, 1fr)',
              lg: 'repeat(6, 1fr)',
            },
          }}
        >
          {tails.map((tail) => (
            <TailCard
              key={tail.id}
              tail={tail}
              showRegion={true}
              viewMode="instagram"
            />
          ))}
        </Box>
      ) : (
        /* Feed card layout */
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
          }}
        >
          {tails.map((tail) => (
            <TailCard
              key={tail.id}
              tail={tail}
              showRegion={true}
              viewMode="card"
            />
          ))}
        </Box>
      )}

      {/* Urgent notice */}
      {showUrgentOnly && tails.length > 0 && (
        <Box
          sx={{
            mt: 4,
            p: 3,
            border: '1px solid #FFBEC2',
            borderRadius: '8px',
            backgroundColor: '#FFEEF0',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#ED4956',
              fontWeight: 600,
              textAlign: 'center',
              mb: 0.5,
            }}
          >
            緊急を要するシッポたちです
          </Typography>
          <Typography
            sx={{ fontSize: '0.8125rem', color: '#8E8E8E', textAlign: 'center' }}
          >
            残り時間がわずかです。お近くの方はぜひ各自治体にご連絡ください。
          </Typography>
        </Box>
      )}
    </Box>
  )
}
