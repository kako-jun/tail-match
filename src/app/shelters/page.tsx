'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  LocationOn,
  Phone,
  Email,
  Language,
  AccessTime
} from '@mui/icons-material'
import Link from 'next/link'

interface Facility {
  id: number
  name: string
  address: string
  phone?: string
  email?: string
  website?: string
  business_hours?: string
  region: {
    id: number
    name: string
  }
  municipality: {
    id: number
    name: string
  }
  active_cats_count?: number
}

interface ApiResponse {
  success: boolean
  data: Facility[]
  error?: string
}

export default function SheltersPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('')

  // デモデータ（実際の/api/sheltersができるまでの仮データ）
  const demoFacilities: Facility[] = [
    {
      id: 1,
      name: "石川県動物愛護センター",
      address: "石川県金沢市泉本町3-132",
      phone: "076-258-7755",
      email: "douai@pref.ishikawa.lg.jp",
      website: "https://www.pref.ishikawa.lg.jp/douai/",
      business_hours: "平日 8:30-17:15（土日祝日休み）",
      region: { id: 17, name: "石川県" },
      municipality: { id: 1701, name: "金沢市" },
      active_cats_count: 12
    },
    {
      id: 2,
      name: "東京都動物愛護相談センター本所",
      address: "東京都世田谷区八幡山2-9-11",
      phone: "03-3302-3507",
      website: "https://www.fukushihoken.metro.tokyo.lg.jp/douso/",
      business_hours: "平日 9:00-17:00（土日祝日休み）",
      region: { id: 13, name: "東京都" },
      municipality: { id: 1323, name: "世田谷区" },
      active_cats_count: 28
    },
    {
      id: 3,
      name: "神奈川県動物愛護センター",
      address: "神奈川県平塚市土屋401",
      phone: "0463-58-3411",
      website: "https://www.pref.kanagawa.jp/div/1630/",
      business_hours: "平日 8:30-17:15（土日祝日休み）",
      region: { id: 14, name: "神奈川県" },
      municipality: { id: 1420, name: "平塚市" },
      active_cats_count: 15
    }
  ]

  useEffect(() => {
    // デモデータを設定
    setFacilities(demoFacilities)
    setFilteredFacilities(demoFacilities)
  }, [])

  // 地域フィルタリング
  useEffect(() => {
    if (selectedRegion === '') {
      setFilteredFacilities(facilities)
    } else {
      setFilteredFacilities(
        facilities.filter(facility => facility.region.id.toString() === selectedRegion)
      )
    }
  }, [selectedRegion, facilities])

  // 地域一覧を取得
  const regions = Array.from(
    new Set(facilities.map(f => f.region.id))
  ).map(id => {
    const facility = facilities.find(f => f.region.id === id)
    return { id, name: facility?.region.name || '' }
  }).sort((a, b) => a.id - b.id)

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ minHeight: '100vh', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="primary" sx={{ mb: 2 }} />
            <Typography color="text.secondary">施設情報を読み込んでいます...</Typography>
          </Box>
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ minHeight: '100vh', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          エラーが発生しました: {error}
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
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      {/* ページヘッダー */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" sx={{ 
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          🏥 全国の保護センターの一覧
        </Typography>
        <Typography variant="h6" color="text.secondary">
          シッポたちを保護している保護センターの情報です
        </Typography>
      </Box>

      {/* フィルタセクション */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            🔍 地域で絞り込み
          </Typography>
          <FormControl size="medium" sx={{ minWidth: 200 }}>
            <InputLabel>地域を選択</InputLabel>
            <Select
              value={selectedRegion}
              label="地域を選択"
              onChange={(e) => setSelectedRegion(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">すべての地域</MenuItem>
              {regions.map(region => (
                <MenuItem key={region.id} value={region.id.toString()}>
                  {region.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body1" color="text.secondary">
            {filteredFacilities.length}件の保護センターが見つかりました
          </Typography>
        </Box>
      </Paper>

      {/* 施設一覧 */}
      {filteredFacilities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>🏢</Typography>
          <Typography variant="h5" component="h3" gutterBottom color="primary">
            保護センターが見つかりませんでした
          </Typography>
          <Typography color="text.secondary">
            選択した地域には登録されている保護センターがありません
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredFacilities.map((facility) => (
            <Grid item xs={12} md={6} lg={4} key={facility.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  transition: 'transform 0.3s ease',
                  boxShadow: 4
                }
              }}>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* 施設名と地域 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" component="h3" sx={{ 
                      fontWeight: 'bold', 
                      color: 'primary.main',
                      mb: 1,
                      lineHeight: 1.3
                    }}>
                      {facility.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={facility.region.name} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                      <Chip 
                        label={facility.municipality.name} 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                      />
                      {facility.active_cats_count !== undefined && (
                        <Chip 
                          label={`${facility.active_cats_count}匹`} 
                          size="small" 
                          color="warning"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* 住所 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary', mt: 0.2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {facility.address}
                    </Typography>
                  </Box>

                  {/* 連絡先情報 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {facility.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {facility.phone}
                        </Typography>
                      </Box>
                    )}
                    
                    {facility.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          wordBreak: 'break-all'
                        }}>
                          {facility.email}
                        </Typography>
                      </Box>
                    )}
                    
                    {facility.website && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Language sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Button
                          href={facility.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ 
                            p: 0, 
                            minWidth: 0, 
                            textAlign: 'left',
                            justifyContent: 'flex-start'
                          }}
                        >
                          <Typography variant="body2" color="primary" sx={{ 
                            textDecoration: 'underline',
                            fontSize: '0.875rem'
                          }}>
                            公式サイト
                          </Typography>
                        </Button>
                      </Box>
                    )}
                    
                    {facility.business_hours && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <AccessTime sx={{ fontSize: 16, mr: 1, color: 'text.secondary', mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                          {facility.business_hours}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 注意書き */}
      <Paper elevation={2} sx={{ mt: 6, p: 4, borderRadius: 3, backgroundColor: 'rgba(255, 248, 220, 0.5)' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          📞 お問い合わせについて
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          猫の譲渡や見学については、各保護センターに直接お問い合わせください。
          保護センターによって手続きや条件が異なりますので、事前に確認されることをお勧めします。
        </Typography>
      </Paper>
    </Container>
  )
}