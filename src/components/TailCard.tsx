import Link from 'next/link'
import { TailWithDetails } from '@/types/database'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  Grid,
  Avatar,
  Divider
} from '@mui/material'
import {
  AccessTime,
  LocationOn,
  Favorite,
  Visibility
} from '@mui/icons-material'

interface TailCardProps {
  tail: TailWithDetails
  showRegion?: boolean
  viewMode?: 'instagram' | 'card'
}

export default function TailCard({ tail, showRegion = true, viewMode = 'card' }: TailCardProps) {
  // 緊急度によるスタイル設定
  const getUrgencyStyle = () => {
    switch (tail.urgency_level) {
      case 'urgent':
        return 'emergency-urgent'
      case 'warning':
        return 'emergency-warning'
      case 'caution':
        return 'emergency-caution'
      default:
        return 'bg-white'
    }
  }

  // 残り日数の表示
  const formatDaysRemaining = () => {
    if (!tail.days_remaining) return null
    
    if (tail.days_remaining < 0) {
      return '期限切れ'
    } else if (tail.days_remaining === 0) {
      return '今日まで！'
    } else {
      return `あと${tail.days_remaining}日`
    }
  }

  // 画像URL（エラー時のフォールバック付き）
  const imageUrl = tail.images && tail.images.length > 0 
    ? tail.images[0] 
    : null

  const getUrgencyColor = () => {
    switch (tail.urgency_level) {
      case 'urgent': return 'error'
      case 'warning': return 'warning'
      case 'caution': return 'secondary'
      default: return 'default'
    }
  }

  // Instagram風表示
  if (viewMode === 'instagram') {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          '&:hover .overlay': {
            opacity: 1
          },
          '&:hover': {
            transform: 'scale(1.02)',
            transition: 'transform 0.3s ease'
          }
        }}
      >
        {/* メイン画像 */}
        <Box
          sx={{
            width: '100%',
            paddingBottom: '100%', // 1:1のアスペクト比
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #FFE4B5 0%, #FFF8DC 100%)'
          }}
        >
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={tail.name || '保護猫'}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                color: 'primary.main',
                opacity: 0.7
              }}
            >
              🐱
            </Box>
          )}

          {/* 右上バッジ - 緊急度 */}
          {tail.urgency_level !== 'normal' && tail.days_remaining !== null && (
            <Chip
              icon={<AccessTime />}
              label={formatDaysRemaining()}
              color={getUrgencyColor() as 'error' | 'warning' | 'secondary' | 'default'}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontWeight: 'bold',
                backdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            />
          )}

          {/* 左上バッジ - 譲渡決定 */}
          {tail.transfer_decided && (
            <Chip
              icon={<Favorite />}
              label="譲渡決定"
              color="success"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                fontWeight: 'bold',
                backdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            />
          )}

          {/* ホバー時のオーバーレイ */}
          <Box
            className="overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              p: 2
            }}
          >
            {/* 基本情報 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                {tail.name || '名前未定'}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={tail.breed || 'ミックス'} 
                  size="small" 
                  sx={{ backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}
                />
                <Chip 
                  label={tail.age_estimate || '年齢不明'} 
                  size="small" 
                  sx={{ backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}
                />
                <Chip 
                  label={tail.gender === 'male' ? 'オス' : tail.gender === 'female' ? 'メス' : '性別不明'} 
                  size="small" 
                  sx={{ backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}
                />
              </Box>

              {showRegion && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'white' }} />
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {tail.region?.name} {tail.municipality?.name}
                  </Typography>
                </Box>
              )}

              {tail.deadline_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'white' }} />
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    期限: {new Date(tail.deadline_date).toLocaleDateString('ja-JP')}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 詳細ボタン */}
            <Button
              component={Link}
              href={`/tails/${tail.id}`}
              variant="contained"
              startIcon={<Visibility />}
              size="small"
              fullWidth
              sx={{
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark'
                }
              }}
            >
              詳細を見る
            </Button>
          </Box>
        </Box>
      </Card>
    )
  }

  // カード表示（従来通り）
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', p: 2 }}>
        {/* 左側: 画像 */}
        <Box sx={{ mr: 2, position: 'relative' }}>
          <Avatar
            sx={{
              width: 120,
              height: 120,
              bgcolor: 'secondary.light',
              fontSize: '3rem'
            }}
            src={imageUrl || undefined}
          >
            🐱
          </Avatar>
          
          {/* 緊急度バッジ */}
          {tail.urgency_level !== 'normal' && tail.days_remaining !== null && (
            <Chip
              icon={<AccessTime />}
              label={formatDaysRemaining()}
              color={getUrgencyColor() as 'error' | 'warning' | 'secondary' | 'default'}
              size="small"
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                fontWeight: 'bold'
              }}
            />
          )}

          {/* 譲渡決定バッジ */}
          {tail.transfer_decided && (
            <Chip
              icon={<Favorite />}
              label="譲渡決定"
              color="success"
              size="small"
              sx={{
                position: 'absolute',
                top: -8,
                left: -8,
                fontWeight: 'bold'
              }}
            />
          )}
        </Box>

        {/* 右側: 基本情報 */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* 名前とステータス */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }} noWrap>
              {tail.name || '名前未定'}
            </Typography>
            {tail.days_remaining !== null && (
              <Chip
                label={formatDaysRemaining()}
                color={getUrgencyColor() as 'error' | 'warning' | 'secondary' | 'default'}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* 基本情報グリッド */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">品種</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {tail.breed || 'ミックス'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">年齢</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {tail.age_estimate || '不明'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">性別</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {tail.gender === 'male' ? 'オス' :
                 tail.gender === 'female' ? 'メス' : '不明'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">毛色</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {tail.color || '不明'}
              </Typography>
            </Grid>
          </Grid>

          {/* 地域情報 */}
          {showRegion && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {tail.region?.name} {tail.municipality?.name}
              </Typography>
            </Box>
          )}

          {/* 期限日 */}
          {tail.deadline_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                期限: {new Date(tail.deadline_date).toLocaleDateString('ja-JP')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        {/* 性格 */}
        {tail.personality && (
          <>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary" className="line-clamp-2">
              {tail.personality}
            </Typography>
          </>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          {tail.transfer_decided && (
            <Chip
              icon={<Favorite />}
              label="譲渡決定"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={Link}
            href={`/tails/${tail.id}`}
            variant="contained"
            startIcon={<Visibility />}
            size="small"
          >
            詳細
          </Button>
          {tail.source_url && (
            <Button
              href={tail.source_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
            >
              施設サイト
            </Button>
          )}
        </Box>
      </CardActions>
    </Card>
  )
}