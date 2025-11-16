'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  CardActions,
  TextField,
  InputAdornment
} from '@mui/material'
import {
  LocationOn,
  Phone,
  Email,
  Language,
  AccessTime,
  Pets,
  ViewList,
  ViewModule,
  Search,
  FilterList
} from '@mui/icons-material'
import Link from 'next/link'

interface Municipality {
  id: number
  region_id: number
  name: string
  website_url?: string
  contact_info?: {
    phone?: string
    address?: string
    email?: string
    hours?: string
  }
  is_active: boolean
}

interface Region {
  id: number
  name: string
  code: string
}

interface MunicipalityWithStats extends Municipality {
  region?: Region
  animals_count?: number
  cats_count?: number
  dogs_count?: number
}

// 地方区分マッピング
const REGION_GROUPS: Record<string, { name: string; prefectures: string[] }> = {
  hokkaido: {
    name: '北海道',
    prefectures: ['北海道']
  },
  tohoku: {
    name: '東北',
    prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県']
  },
  kanto: {
    name: '関東',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県']
  },
  chubu: {
    name: '中部',
    prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県']
  },
  kansai: {
    name: '関西',
    prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県']
  },
  chugoku: {
    name: '中国',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県']
  },
  shikoku: {
    name: '四国',
    prefectures: ['徳島県', '香川県', '愛媛県', '高知県']
  },
  kyushu: {
    name: '九州・沖縄',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
  }
}

export default function SheltersPage() {
  const [municipalities, setMunicipalities] = useState<MunicipalityWithStats[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<MunicipalityWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // 地域一覧取得
        const regionsRes = await fetch('/api/regions')
        const regionsData = await regionsRes.json()
        setRegions(regionsData.data || [])

        // 自治体一覧取得
        const municipalitiesRes = await fetch('/api/municipalities')
        const municipalitiesData = await municipalitiesRes.json()

        // 各自治体の保護動物数を取得
        const municipalitiesWithStats = await Promise.all(
          (municipalitiesData.data || []).map(async (muni: Municipality) => {
            try {
              const tailsRes = await fetch(`/api/tails?municipality_id=${muni.id}&status=available`)
              const tailsData = await tailsRes.json()
              const animals = tailsData.data || []

              return {
                ...muni,
                region: regionsData.data?.find((r: Region) => r.id === muni.region_id),
                animals_count: animals.length,
                cats_count: animals.filter((a: any) => a.animal_type === 'cat').length,
                dogs_count: animals.filter((a: any) => a.animal_type === 'dog').length
              }
            } catch {
              return {
                ...muni,
                region: regionsData.data?.find((r: Region) => r.id === muni.region_id),
                animals_count: 0,
                cats_count: 0,
                dogs_count: 0
              }
            }
          })
        )

        setMunicipalities(municipalitiesWithStats)
        setFilteredMunicipalities(municipalitiesWithStats)
      } catch (err) {
        setError('データの取得に失敗しました')
        console.error('データ取得エラー:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // フィルタリング
  useEffect(() => {
    let filtered = municipalities

    // 地域フィルター
    if (selectedRegion) {
      filtered = filtered.filter(m => m.region?.name === selectedRegion)
    }

    // キーワード検索
    if (searchKeyword) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        m.region?.name.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    }

    setFilteredMunicipalities(filtered)
  }, [selectedRegion, searchKeyword, municipalities])

  // 地域選択ダイアログを開く
  const handleOpenRegionDialog = () => {
    setRegionDialogOpen(true)
  }

  // 地域を選択
  const handleSelectRegion = (regionName: string) => {
    setSelectedRegion(regionName)
    setRegionDialogOpen(false)
  }

  // 地域選択をクリア
  const handleClearRegion = () => {
    setSelectedRegion('')
  }

  // 統計計算
  const totalAnimals = municipalities.reduce((sum, m) => sum + (m.animals_count || 0), 0)
  const totalCats = municipalities.reduce((sum, m) => sum + (m.cats_count || 0), 0)
  const totalDogs = municipalities.reduce((sum, m) => sum + (m.dogs_count || 0), 0)

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
          {error}
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            再読み込み
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ページヘッダー */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          🏥 保護センター
        </Typography>
        <Typography variant="h6" color="text.secondary">
          全国の保護動物を管理している施設一覧
        </Typography>
      </Box>

      {/* 統計情報 */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {municipalities.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              登録施設数
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {totalAnimals}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              保護動物総数
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
              {totalCats} 🐱
            </Typography>
            <Typography variant="body2" color="text.secondary">
              保護猫
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {totalDogs} 🐶
            </Typography>
            <Typography variant="body2" color="text.secondary">
              保護犬
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* フィルター */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                絞り込み
              </Typography>
            </Box>

            {/* 地域選択 */}
            {selectedRegion ? (
              <Chip
                label={selectedRegion}
                onDelete={handleClearRegion}
                color="primary"
              />
            ) : (
              <Button variant="outlined" onClick={handleOpenRegionDialog} size="small">
                🗾 地域を選択
              </Button>
            )}

            {/* キーワード検索 */}
            <TextField
              size="small"
              placeholder="施設名で検索"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 200 }}
            />

            <Typography variant="body2" color="text.secondary">
              {filteredMunicipalities.length}件
            </Typography>
          </Box>

          {/* 表示切り替え */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="grid">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* 施設一覧 */}
      {filteredMunicipalities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>🏢</Typography>
          <Typography variant="h5" gutterBottom color="primary">
            施設が見つかりませんでした
          </Typography>
          <Typography color="text.secondary">
            条件を変更して再度検索してください
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={viewMode === 'grid' ? 3 : 2}>
          {filteredMunicipalities.map((municipality) => (
            <Grid item xs={12} sm={viewMode === 'grid' ? 6 : 12} md={viewMode === 'grid' ? 4 : 12} key={municipality.id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: viewMode === 'grid' ? 'translateY(-4px)' : 'none',
                  boxShadow: 4
                }
              }}>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* ヘッダー */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                      mb: 1,
                      lineHeight: 1.3
                    }}>
                      {municipality.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {municipality.region && (
                        <Chip
                          label={municipality.region.name}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {municipality.is_active ? (
                        <Chip label="稼働中" size="small" color="success" />
                      ) : (
                        <Chip label="停止中" size="small" color="default" />
                      )}
                    </Box>
                  </Box>

                  {/* 統計 */}
                  {(municipality.animals_count && municipality.animals_count > 0) && (
                    <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Pets color="primary" fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          保護動物: {municipality.animals_count}匹
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {municipality.cats_count! > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            🐱 猫: {municipality.cats_count}
                          </Typography>
                        )}
                        {municipality.dogs_count! > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            🐶 犬: {municipality.dogs_count}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* 連絡先情報 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {municipality.contact_info?.address && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary', mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                          {municipality.contact_info.address}
                        </Typography>
                      </Box>
                    )}

                    {municipality.contact_info?.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {municipality.contact_info.phone}
                        </Typography>
                      </Box>
                    )}

                    {municipality.contact_info?.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          {municipality.contact_info.email}
                        </Typography>
                      </Box>
                    )}

                    {municipality.contact_info?.hours && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <AccessTime sx={{ fontSize: 16, mr: 1, color: 'text.secondary', mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                          {municipality.contact_info.hours}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                  {municipality.website_url && (
                    <Button
                      href={municipality.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      size="small"
                      startIcon={<Language />}
                      fullWidth
                    >
                      公式サイト
                    </Button>
                  )}
                  {municipality.animals_count! > 0 && (
                    <Button
                      component={Link}
                      href={`/search?municipality_id=${municipality.id}`}
                      variant="contained"
                      size="small"
                      startIcon={<Pets />}
                      fullWidth
                    >
                      動物を見る
                    </Button>
                  )}
                </CardActions>
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
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          動物の譲渡や見学については、各保護センターに直接お問い合わせください。<br />
          施設によって手続きや条件が異なりますので、事前に確認されることをお勧めします。
        </Typography>
      </Paper>

      {/* 地域選択ダイアログ */}
      <Dialog
        open={regionDialogOpen}
        onClose={() => setRegionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            🗾 地域を選択
          </Typography>
        </DialogTitle>
        <DialogContent>
          {Object.entries(REGION_GROUPS).map(([groupCode, group]) => {
            const prefecturesInGroup = regions.filter(r =>
              group.prefectures.some(p => r.name.includes(p.replace(/[都道府県]/g, '')))
            )

            if (prefecturesInGroup.length === 0) return null

            return (
              <Box key={groupCode} sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'bold',
                    color: 'primary.main',
                    mb: 1
                  }}
                >
                  {group.name}
                </Typography>
                <List dense>
                  {prefecturesInGroup.map(region => (
                    <ListItem key={region.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSelectRegion(region.name)}
                        selected={selectedRegion === region.name}
                      >
                        <ListItemText primary={region.name} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )
          })}
        </DialogContent>
      </Dialog>
    </Container>
  )
}
