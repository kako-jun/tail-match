'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  FormGroup,
  Checkbox,
  Button,
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
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
} from '@mui/material'
import { Search, FilterList, Close, Sort } from '@mui/icons-material'
import TailCard from '@/components/TailCard'
import type { TailWithDetails } from '@/types/database'

const REGION_MAP: Record<string, { name: string; prefectures: string[] }> = {
  hokkaido: { name: '北海道', prefectures: ['北海道'] },
  tohoku: { name: '東北', prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  kanto: { name: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  chubu: { name: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  kansai: { name: '関西', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  chugoku: { name: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  shikoku: { name: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  kyushu: { name: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
}

const selectSx = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DBDBDB', borderWidth: 1 },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#A8A8A8' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#262626', borderWidth: 1 },
  '& .MuiSelect-select': { padding: '9px 14px', color: '#262626', fontSize: '0.875rem' },
}

export default function SearchPage() {
  const [animalType, setAnimalType] = useState<'cat' | 'dog'>('cat')
  const [keyword, setKeyword] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('')
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const [sortBy, setSortBy] = useState<'deadline_date' | 'created_at' | 'updated_at'>('deadline_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(12)

  const [results, setResults] = useState<TailWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const featureOptions = [
    { value: 'friendly', label: '人懐っこい' },
    { value: 'calm', label: '穏やか' },
    { value: 'active', label: '活発' },
    { value: 'quiet', label: 'おとなしい' },
    { value: 'playful', label: '遊び好き' },
  ]

  const handleSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        animal_type: animalType,
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
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

  useEffect(() => {
    handleSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalType, page, sortBy, sortOrder])

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
    setPage(1)
  }

  const handleSortOrderChange = (newSortOrder: typeof sortOrder) => {
    setSortOrder(newSortOrder)
    setPage(1)
  }

  const handleSelectPrefecture = (prefecture: string, region: string) => {
    setSelectedPrefecture(prefecture)
    setSelectedRegion(region)
    setRegionDialogOpen(false)
  }

  const handleClearPrefecture = () => {
    setSelectedPrefecture('')
    setSelectedRegion('')
  }

  const handleFeatureChange = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page title */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #DBDBDB' }}>
        <Typography sx={{ fontSize: '1.375rem', fontWeight: 300, color: '#262626', letterSpacing: '-0.01em' }}>
          動物を探す
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E', mt: 0.5 }}>
          あなたにぴったりの家族を見つけましょう
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        {/* Sidebar filter */}
        <Box
          sx={{
            width: { xs: '100%', md: 260 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: 80,
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            p: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
            <FilterList sx={{ fontSize: 16, color: '#8E8E8E' }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
              絞り込み
            </Typography>
          </Box>

          {/* Animal type */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#8E8E8E', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              動物の種類
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid #EFEFEF', p: 1.5 }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: animalType === 'cat' ? 600 : 400, color: animalType === 'cat' ? '#262626' : '#8E8E8E' }}>
                🐱 猫
              </Typography>
              <Switch
                checked={animalType === 'dog'}
                onChange={(e) => setAnimalType(e.target.checked ? 'dog' : 'cat')}
                size="small"
                sx={{
                  mx: 'auto',
                  '& .MuiSwitch-thumb': { backgroundColor: '#262626' },
                  '& .MuiSwitch-track': { backgroundColor: '#DBDBDB' },
                }}
              />
              <Typography sx={{ fontSize: '0.875rem', fontWeight: animalType === 'dog' ? 600 : 400, color: animalType === 'dog' ? '#262626' : '#8E8E8E' }}>
                🐶 犬
              </Typography>
            </Box>
          </Box>

          {/* Region */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#8E8E8E', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              地域
            </Typography>
            {selectedPrefecture ? (
              <Chip
                label={selectedPrefecture}
                onDelete={handleClearPrefecture}
                deleteIcon={<Close sx={{ fontSize: '14px !important' }} />}
                sx={{
                  width: '100%',
                  justifyContent: 'space-between',
                  borderRadius: '6px',
                  border: '1px solid #DBDBDB',
                  backgroundColor: '#FAFAFA',
                  fontSize: '0.8125rem',
                  '& .MuiChip-deleteIcon': { color: '#8E8E8E' },
                }}
              />
            ) : (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setRegionDialogOpen(true)}
                sx={{
                  fontSize: '0.8125rem',
                  py: 1,
                  borderColor: '#DBDBDB',
                  color: '#262626',
                  '&:hover': { borderColor: '#A8A8A8', backgroundColor: 'transparent' },
                }}
              >
                地方を選択
              </Button>
            )}
          </Box>

          {/* Keyword */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#8E8E8E', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              キーワード
            </Typography>
            <TextField
              fullWidth
              placeholder="白猫、子猫…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: '#FAFAFA',
                  '& fieldset': { borderColor: '#DBDBDB' },
                  '&:hover fieldset': { borderColor: '#A8A8A8' },
                  '&.Mui-focused fieldset': { borderColor: '#262626', borderWidth: 1 },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 16, color: '#8E8E8E' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Features */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#8E8E8E', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
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
                      size="small"
                      sx={{
                        color: '#DBDBDB',
                        '&.Mui-checked': { color: '#262626' },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.8125rem', color: '#262626' }}>
                      {option.label}
                    </Typography>
                  }
                  sx={{ mb: 0.25 }}
                />
              ))}
            </FormGroup>
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleSearch}
            disabled={loading}
            startIcon={<Search sx={{ fontSize: 16 }} />}
            sx={{
              py: 1.25,
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: '#262626',
              '&:hover': { backgroundColor: '#000000' },
            }}
          >
            {loading ? '検索中...' : '検索する'}
          </Button>
        </Box>

        {/* Results */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Sort bar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #DBDBDB',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
              {loading ? '検索中...' : `${totalCount}件`}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                  sx={selectSx}
                >
                  <MenuItem value="deadline_date" sx={{ fontSize: '0.875rem' }}>期限日順</MenuItem>
                  <MenuItem value="created_at" sx={{ fontSize: '0.875rem' }}>登録日順</MenuItem>
                  <MenuItem value="updated_at" sx={{ fontSize: '0.875rem' }}>更新日順</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select
                  value={sortOrder}
                  onChange={(e) => handleSortOrderChange(e.target.value as typeof sortOrder)}
                  sx={selectSx}
                >
                  <MenuItem value="asc" sx={{ fontSize: '0.875rem' }}>昇順</MenuItem>
                  <MenuItem value="desc" sx={{ fontSize: '0.875rem' }}>降順</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={24} thickness={2} sx={{ color: '#262626', mb: 2 }} />
                <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>検索中...</Typography>
              </Box>
            </Box>
          ) : results.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10, border: '1px solid #DBDBDB', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              <Typography sx={{ fontSize: '0.9375rem', color: '#8E8E8E' }}>
                条件に一致する動物が見つかりませんでした
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                  },
                }}
              >
                {results.map(tail => (
                  <TailCard key={tail.id} tail={tail} viewMode="card" />
                ))}
              </Box>

              {totalCount > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                  <Pagination
                    count={Math.ceil(totalCount / itemsPerPage)}
                    page={page}
                    onChange={handlePageChange}
                    size="medium"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPaginationItem-root': {
                        border: '1px solid #DBDBDB',
                        borderRadius: '6px',
                        color: '#262626',
                        '&.Mui-selected': {
                          backgroundColor: '#262626',
                          color: '#FFFFFF',
                          borderColor: '#262626',
                        },
                        '&:hover': { backgroundColor: '#F5F5F5' },
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Region dialog */}
      <Dialog
        open={regionDialogOpen}
        onClose={() => setRegionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #DBDBDB', pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626' }}>
              地域を選択
            </Typography>
            <Close
              sx={{ fontSize: 20, color: '#8E8E8E', cursor: 'pointer' }}
              onClick={() => setRegionDialogOpen(false)}
            />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {Object.entries(REGION_MAP).map(([regionCode, region]) => (
            <Box key={regionCode} sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mb: 1,
                }}
              >
                {region.name}
              </Typography>
              <List dense disablePadding>
                {region.prefectures.map(prefecture => (
                  <ListItem key={prefecture} disablePadding>
                    <ListItemButton
                      onClick={() => handleSelectPrefecture(prefecture, regionCode)}
                      selected={selectedPrefecture === prefecture}
                      sx={{
                        borderRadius: '6px',
                        py: 0.75,
                        '&.Mui-selected': {
                          backgroundColor: '#262626',
                          color: '#FFFFFF',
                          '&:hover': { backgroundColor: '#000000' },
                        },
                        '&:hover': { backgroundColor: '#F5F5F5' },
                      }}
                    >
                      <ListItemText
                        primary={prefecture}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                      />
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
