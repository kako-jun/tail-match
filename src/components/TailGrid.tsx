'use client'

import { useState, useEffect } from 'react'
import TailCard from './TailCard'
import { TailWithDetails, TailSearchParams } from '@/types/database'
import { Loader2, AlertCircle } from 'lucide-react'
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  AlertTitle,
  Button,
  Paper,
  Chip,
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
          
          // 検索パラメータを構築
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
  }, [JSON.stringify(searchParams), showUrgentOnly, maxCount])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="primary" sx={{ mb: 2 }} />
          <Typography color="text.secondary">尻尾ちゃんを探しています...</Typography>
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>エラーが発生しました</AlertTitle>
          {error}
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            color="primary"
          >
            再読み込み
          </Button>
        </Box>
      </Box>
    )
  }

  if (tails.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>😿</Typography>
        <Typography variant="h5" component="h3" gutterBottom color="primary">
          {showUrgentOnly ? '緊急の尻尾ちゃんは見つかりませんでした' : '条件に合う尻尾ちゃんが見つかりませんでした'}
        </Typography>
        <Typography color="text.secondary">
          {showUrgentOnly ? 
            '現在、緊急度の高い保護猫はいません。' : 
            '検索条件を変更して再度お試しください。'
          }
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 2 }}>
      {/* ヘッダー情報と表示切り替え */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Paper elevation={2} sx={{ px: 4, py: 2, borderRadius: 3, flex: 1, minWidth: 'fit-content' }}>
          <Typography variant="h6" component="p" sx={{ 
            fontWeight: 'semibold',
            color: 'text.primary',
            textAlign: 'center'
          }}>
            {showUrgentOnly ? 
              `🚨 緊急度の高い尻尾ちゃん ${tails.length}匹` :
              `😺 ${tails.length}匹の尻尾ちゃんが見つかりました`
            }
          </Typography>
        </Paper>

        {/* 表示モード切り替え */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(event, newMode) => {
            if (newMode !== null) {
              setViewMode(newMode)
            }
          }}
          size="small"
        >
          <ToggleButton value="instagram" aria-label="画像中心表示">
            <ViewModule sx={{ mr: 1 }} />
            画像中心
          </ToggleButton>
          <ToggleButton value="card" aria-label="詳細表示">
            <ViewList sx={{ mr: 1 }} />
            詳細表示
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Flexbox表示 */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 3,
        justifyContent: 'flex-start'
      }}>
        {tails.map((tail) => (
          <Box 
            key={tail.id}
            sx={{ 
              flex: viewMode === 'instagram' ? {
                xs: '1 1 calc(50% - 12px)',    // モバイル: 2列
                sm: '1 1 calc(33.333% - 16px)', // タブレット: 3列
                md: '1 1 calc(25% - 18px)',     // デスクトップ: 4列
                lg: '1 1 calc(20% - 19px)'      // 大画面: 5列
              } : {
                xs: '1 1 100%',                 // カード: モバイル1列
                sm: '1 1 calc(50% - 12px)',     // カード: タブレット2列
                md: '1 1 calc(50% - 12px)',     // カード: デスクトップ2列
                lg: '1 1 calc(33.333% - 16px)'  // カード: 大画面3列
              },
              minWidth: 0
            }}
          >
            <TailCard 
              tail={tail}
              showRegion={true}
              viewMode={viewMode}
            />
          </Box>
        ))}
      </Box>

      {/* 緊急度の高い猫がいる場合の注意書き */}
      {showUrgentOnly && tails.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ textAlign: 'center' }}>
            <AlertTitle sx={{ fontWeight: 'bold' }}>
              ⚠️ 緊急を要する尻尾ちゃんたちです
            </AlertTitle>
            これらの猫たちは残り時間がわずかです。
            お近くの方、または遠方でも引き取り可能な方は、
            各自治体に直接お問い合わせください。
          </Alert>
        </Box>
      )}
    </Box>
  )
}