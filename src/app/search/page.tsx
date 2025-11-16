'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  FormGroup,
  Checkbox,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material'
import { Search, FilterList, Close, Sort } from '@mui/icons-material'
import TailCard from '@/components/TailCard'
import type { TailWithDetails } from '@/types/database'

// 地方区分のマッピング
const REGION_MAP: Record<string, { name: string; prefectures: string[] }> = {
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

export default function SearchPage() {
  // 検索条件のステート
  const [animalType, setAnimalType] = useState<'cat' | 'dog'>('cat')
  const [keyword, setKeyword] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('')
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  // ソート・ページネーション
  const [sortBy, setSortBy] = useState<'deadline_date' | 'created_at' | 'updated_at'>('deadline_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(12)

  // 検索結果のステート
  const [results, setResults] = useState<TailWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // 特徴のオプション
  const featureOptions = [
    { value: 'friendly', label: '人懐っこい' },
    { value: 'calm', label: '穏やか' },
    { value: 'active', label: '活発' },
    { value: 'quiet', label: 'おとなしい' },
    { value: 'playful', label: '遊び好き' }
  ]

  // 検索実行
  const handleSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        animal_type: animalType,
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      })

      if (keyword) params.append('keyword', keyword)
      if (selectedPrefecture) params.append('prefecture', selectedPrefecture)

      const response = await fetch(`/api/tails?${params}`)
      const data = await response.json()

      setResults(data.data || [])
      setTotalCount(data.total || 0)
    } catch (error) {
      console.error('検索エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み時に検索実行
  useEffect(() => {
    handleSearch()
  }, [animalType, page, sortBy, sortOrder])

  // ページ変更時はトップにスクロール
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ソート変更時はページをリセット
  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
    setPage(1)
  }

  const handleSortOrderChange = (newSortOrder: typeof sortOrder) => {
    setSortOrder(newSortOrder)
    setPage(1)
  }

  // 地方選択ダイアログを開く
  const handleOpenRegionDialog = () => {
    setRegionDialogOpen(true)
  }

  // 都道府県を選択
  const handleSelectPrefecture = (prefecture: string, region: string) => {
    setSelectedPrefecture(prefecture)
    setSelectedRegion(region)
    setRegionDialogOpen(false)
  }

  // 都道府県選択をクリア
  const handleClearPrefecture = () => {
    setSelectedPrefecture('')
    setSelectedRegion('')
  }

  // 特徴のチェックボックス変更
  const handleFeatureChange = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ページタイトル */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          🔍 動物を探す
        </Typography>
        <Typography variant="h6" color="text.secondary">
          あなたにぴったりの家族を見つけましょう
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 検索フィルター */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, position: 'sticky', top: 16 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <FilterList sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                検索条件
              </Typography>
            </Box>

            {/* 犬猫スイッチ */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                動物の種類
              </Typography>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'background.default',
                borderRadius: 3,
                p: 1
              }}>
                <Typography sx={{
                  fontWeight: animalType === 'cat' ? 'bold' : 'normal',
                  color: animalType === 'cat' ? 'primary.main' : 'text.secondary'
                }}>
                  🐱 猫
                </Typography>
                <Switch
                  checked={animalType === 'dog'}
                  onChange={(e) => setAnimalType(e.target.checked ? 'dog' : 'cat')}
                  sx={{ mx: 1 }}
                />
                <Typography sx={{
                  fontWeight: animalType === 'dog' ? 'bold' : 'normal',
                  color: animalType === 'dog' ? 'primary.main' : 'text.secondary'
                }}>
                  🐶 犬
                </Typography>
              </Box>
            </Box>

            {/* 都道府県選択 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                地域
              </Typography>
              {selectedPrefecture ? (
                <Chip
                  label={selectedPrefecture}
                  onDelete={handleClearPrefecture}
                  deleteIcon={<Close />}
                  color="primary"
                  sx={{ width: '100%', justifyContent: 'space-between' }}
                />
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleOpenRegionDialog}
                  sx={{ py: 1.5 }}
                >
                  🗾 地方を選択
                </Button>
              )}
            </Box>

            {/* キーワード検索 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                キーワード
              </Typography>
              <TextField
                fullWidth
                placeholder="例: 白猫、子猫、トラ柄"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* 特徴チェックボックス */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                性格・特徴
              </Typography>
              <FormGroup>
                {featureOptions.map(option => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={selectedFeatures.includes(option.value)}
                        onChange={() => handleFeatureChange(option.value)}
                      />
                    }
                    label={option.label}
                  />
                ))}
              </FormGroup>
            </Box>

            {/* 検索ボタン */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleSearch}
              disabled={loading}
              startIcon={<Search />}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? '検索中...' : '検索する'}
            </Button>
          </Paper>
        </Grid>

        {/* 検索結果 */}
        <Grid item xs={12} md={8}>
          {/* ヘッダー・ソート */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              検索結果: {totalCount}件
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>並び順</InputLabel>
                <Select
                  value={sortBy}
                  label="並び順"
                  onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                  startAdornment={<Sort fontSize="small" sx={{ ml: 1, mr: -0.5 }} />}
                >
                  <MenuItem value="deadline_date">期限日順</MenuItem>
                  <MenuItem value="created_at">登録日順</MenuItem>
                  <MenuItem value="updated_at">更新日順</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>順序</InputLabel>
                <Select
                  value={sortOrder}
                  label="順序"
                  onChange={(e) => handleSortOrderChange(e.target.value as typeof sortOrder)}
                >
                  <MenuItem value="asc">昇順</MenuItem>
                  <MenuItem value="desc">降順</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {results.length === 0 ? (
            <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {loading ? '検索中...' : '条件に一致する動物が見つかりませんでした'}
              </Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={3}>
                {results.map(tail => (
                  <Grid item xs={12} sm={6} lg={4} key={tail.id}>
                    <TailCard tail={tail} />
                  </Grid>
                ))}
              </Grid>

              {/* ページネーション */}
              {totalCount > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={Math.ceil(totalCount / itemsPerPage)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>

      {/* 地方→都道府県選択ダイアログ */}
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
          {Object.entries(REGION_MAP).map(([regionCode, region]) => (
            <Box key={regionCode} sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: 'primary.main',
                  mb: 1
                }}
              >
                {region.name}
              </Typography>
              <List dense>
                {region.prefectures.map(prefecture => (
                  <ListItem key={prefecture} disablePadding>
                    <ListItemButton
                      onClick={() => handleSelectPrefecture(prefecture, regionCode)}
                      selected={selectedPrefecture === prefecture}
                    >
                      <ListItemText primary={prefecture} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </Container>
  )
}
