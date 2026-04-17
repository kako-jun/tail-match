'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Chip,
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
  TextField,
  InputAdornment,
} from '@mui/material';
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
  FilterList,
  Close,
} from '@mui/icons-material';
import Link from 'next/link';

interface Municipality {
  id: number;
  region_id: number;
  name: string;
  website_url?: string;
  contact_info?: {
    phone?: string;
    address?: string;
    email?: string;
    hours?: string;
  };
  is_active: boolean;
}

interface Region {
  id: number;
  name: string;
  code: string;
}

interface MunicipalityWithStats extends Municipality {
  region?: Region;
  animals_count?: number;
  cats_count?: number;
  dogs_count?: number;
}

// 地方区分マッピング
const REGION_GROUPS: Record<string, { name: string; prefectures: string[] }> = {
  hokkaido: {
    name: '北海道',
    prefectures: ['北海道'],
  },
  tohoku: {
    name: '東北',
    prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  },
  kanto: {
    name: '関東',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  },
  chubu: {
    name: '中部',
    prefectures: [
      '新潟県',
      '富山県',
      '石川県',
      '福井県',
      '山梨県',
      '長野県',
      '岐阜県',
      '静岡県',
      '愛知県',
    ],
  },
  kansai: {
    name: '関西',
    prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  },
  chugoku: {
    name: '中国',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  },
  shikoku: {
    name: '四国',
    prefectures: ['徳島県', '香川県', '愛媛県', '高知県'],
  },
  kyushu: {
    name: '九州・沖縄',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
  },
};

export default function SheltersPage() {
  const [municipalities, setMunicipalities] = useState<MunicipalityWithStats[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<MunicipalityWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);

  // データ取得 — single batch request (municipalities API already includes counts via JOIN)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 地域一覧取得
        const regionsRes = await fetch('/api/regions');
        const regionsData = (await regionsRes.json()) as Record<string, any>;
        const regionsArr: Region[] = regionsData.data || [];
        setRegions(regionsArr);

        // 自治体一覧取得 (already includes available_tails_count and region info from server JOIN)
        const municipalitiesRes = await fetch('/api/municipalities');
        const municipalitiesData = (await municipalitiesRes.json()) as Record<string, any>;

        const municipalitiesWithStats: MunicipalityWithStats[] = (
          municipalitiesData.data || []
        ).map((muni: any) => ({
          ...muni,
          region: muni.region || regionsArr.find((r: Region) => r.id === muni.region_id),
          animals_count: muni.available_tails_count ?? 0,
          cats_count: muni.cats_count ?? 0,
          dogs_count: muni.dogs_count ?? 0,
        }));

        setMunicipalities(municipalitiesWithStats);
        setFilteredMunicipalities(municipalitiesWithStats);
      } catch (err) {
        setError('データの取得に失敗しました');
        console.error('データ取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // フィルタリング
  useEffect(() => {
    let filtered = municipalities;

    // 地域フィルター
    if (selectedRegion) {
      filtered = filtered.filter((m) => m.region?.name === selectedRegion);
    }

    // キーワード検索
    if (searchKeyword) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          m.region?.name.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    setFilteredMunicipalities(filtered);
  }, [selectedRegion, searchKeyword, municipalities]);

  // 地域選択ダイアログを開く
  const handleOpenRegionDialog = () => {
    setRegionDialogOpen(true);
  };

  // 地域を選択
  const handleSelectRegion = (regionName: string) => {
    setSelectedRegion(regionName);
    setRegionDialogOpen(false);
  };

  // 地域選択をクリア
  const handleClearRegion = () => {
    setSelectedRegion('');
  };

  // 統計計算

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={24} thickness={2} sx={{ color: '#262626', mb: 2 }} />
            <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
              施設情報を読み込んでいます...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: 4 }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ borderColor: '#DBDBDB', color: '#262626' }}
          >
            再読み込み
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #DBDBDB' }}>
        <Typography
          sx={{ fontSize: '1.375rem', fontWeight: 300, color: '#262626', letterSpacing: '-0.01em' }}
        >
          保護センター
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E', mt: 0.5 }}>
          全国のシッポたちを保護している施設一覧
        </Typography>
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
          登録施設数:{' '}
          <Box component="span" sx={{ color: '#262626', fontWeight: 600 }}>
            {municipalities.length}
          </Box>
        </Typography>
      </Box>

      {/* Filter bar */}
      <Box
        sx={{
          border: '1px solid #DBDBDB',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          p: 2.5,
          mb: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList sx={{ fontSize: 16, color: '#8E8E8E' }} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
            絞り込み
          </Typography>
        </Box>

        {selectedRegion ? (
          <Chip
            label={selectedRegion}
            onDelete={handleClearRegion}
            deleteIcon={<Close sx={{ fontSize: '14px !important' }} />}
            sx={{
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
            onClick={handleOpenRegionDialog}
            size="small"
            sx={{
              fontSize: '0.8125rem',
              borderColor: '#DBDBDB',
              color: '#262626',
              '&:hover': { borderColor: '#A8A8A8', backgroundColor: 'transparent' },
            }}
          >
            地域を選択
          </Button>
        )}

        <TextField
          size="small"
          placeholder="施設名で検索"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
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

        <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', ml: 'auto' }}>
          {filteredMunicipalities.length}件
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid #DBDBDB',
              borderRadius: '6px !important',
              p: '5px 8px',
              '&.Mui-selected': {
                backgroundColor: '#262626',
                color: '#FFFFFF',
                borderColor: '#262626',
              },
              '&:hover': { backgroundColor: '#F5F5F5' },
            },
          }}
        >
          <ToggleButton value="grid">
            <ViewModule sx={{ fontSize: 18 }} />
          </ToggleButton>
          <ToggleButton value="list">
            <ViewList sx={{ fontSize: 18 }} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Shelter list */}
      {filteredMunicipalities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography sx={{ fontSize: '0.9375rem', color: '#8E8E8E' }}>
            施設が見つかりませんでした
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns:
              viewMode === 'grid'
                ? { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }
                : '1fr',
          }}
        >
          {filteredMunicipalities.map((municipality) => (
            <Box
              key={municipality.id}
              sx={{
                border: '1px solid #DBDBDB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.15s ease',
                '&:hover': { borderColor: '#A8A8A8' },
              }}
            >
              <Box sx={{ p: 2.5, flex: 1 }}>
                {/* Name + badges */}
                <Box sx={{ mb: 1.5 }}>
                  <Typography
                    sx={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: '#262626',
                      mb: 0.75,
                      lineHeight: 1.3,
                    }}
                  >
                    {municipality.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {municipality.region && (
                      <Box
                        component="span"
                        sx={{
                          px: 1,
                          py: '2px',
                          borderRadius: '4px',
                          backgroundColor: '#F5F5F5',
                          fontSize: '0.6875rem',
                          color: '#8E8E8E',
                          fontWeight: 500,
                        }}
                      >
                        {municipality.region.name}
                      </Box>
                    )}
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: '2px',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        ...(municipality.is_active
                          ? {
                              backgroundColor: '#F0FFF4',
                              color: '#2E7D32',
                              border: '1px solid #A5D6A7',
                            }
                          : {
                              backgroundColor: '#F5F5F5',
                              color: '#8E8E8E',
                              border: '1px solid #DBDBDB',
                            }),
                      }}
                    >
                      {municipality.is_active ? '稼働中' : '停止中'}
                    </Box>
                  </Box>
                </Box>

                {/* Animal count */}
                {municipality.animals_count != null && municipality.animals_count > 0 && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      backgroundColor: '#FAFAFA',
                      borderRadius: '6px',
                      border: '1px solid #EFEFEF',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Pets sx={{ fontSize: 14, color: '#8E8E8E' }} />
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#262626' }}>
                        シッポ {municipality.animals_count}匹
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {municipality.cats_count != null && municipality.cats_count > 0 && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
                          🐱 猫 {municipality.cats_count}
                        </Typography>
                      )}
                      {municipality.dogs_count != null && municipality.dogs_count > 0 && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
                          🐶 犬 {municipality.dogs_count}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 1.5, borderColor: '#EFEFEF' }} />

                {/* Contact info */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {municipality.contact_info?.address && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationOn
                        sx={{ fontSize: 14, color: '#8E8E8E', mt: '2px', flexShrink: 0 }}
                      />
                      <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E', lineHeight: 1.5 }}>
                        {municipality.contact_info.address}
                      </Typography>
                    </Box>
                  )}
                  {municipality.contact_info?.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone sx={{ fontSize: 14, color: '#8E8E8E', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
                        {municipality.contact_info.phone}
                      </Typography>
                    </Box>
                  )}
                  {municipality.contact_info?.hours && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <AccessTime
                        sx={{ fontSize: 14, color: '#8E8E8E', mt: '2px', flexShrink: 0 }}
                      />
                      <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E', lineHeight: 1.5 }}>
                        {municipality.contact_info.hours}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ px: 2.5, pb: 2.5, display: 'flex', gap: 1 }}>
                {municipality.website_url && (
                  <Button
                    href={municipality.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    startIcon={<Language sx={{ fontSize: 14 }} />}
                    fullWidth
                    sx={{
                      fontSize: '0.8125rem',
                      py: 0.875,
                      borderColor: '#DBDBDB',
                      color: '#262626',
                      '&:hover': { borderColor: '#A8A8A8', backgroundColor: 'transparent' },
                    }}
                  >
                    公式サイト
                  </Button>
                )}
                {municipality.animals_count != null && municipality.animals_count > 0 && (
                  <Button
                    component={Link}
                    href={`/search?municipality_id=${municipality.id}`}
                    variant="contained"
                    size="small"
                    startIcon={<Pets sx={{ fontSize: 14 }} />}
                    fullWidth
                    sx={{
                      fontSize: '0.8125rem',
                      py: 0.875,
                      backgroundColor: '#262626',
                      '&:hover': { backgroundColor: '#000000' },
                    }}
                  >
                    シッポを見る
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Notice */}
      <Box
        sx={{
          mt: 5,
          p: 3,
          border: '1px solid #DBDBDB',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 1 }}>
          お問い合わせについて
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.7 }}>
          シッポたちの譲渡や見学については、各保護センターに直接お問い合わせください。
          <br />
          施設によって手続きや条件が異なりますので、事前に確認されることをお勧めします。
        </Typography>
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
          {Object.entries(REGION_GROUPS).map(([groupCode, group]) => {
            const prefecturesInGroup = regions.filter((r) =>
              group.prefectures.some((p) => r.name.includes(p.replace(/[都道府県]/g, '')))
            );
            if (prefecturesInGroup.length === 0) return null;

            return (
              <Box key={groupCode} sx={{ mb: 2.5 }}>
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
                  {group.name}
                </Typography>
                <List dense disablePadding>
                  {prefecturesInGroup.map((region) => (
                    <ListItem key={region.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSelectRegion(region.name)}
                        selected={selectedRegion === region.name}
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
                          primary={region.name}
                          primaryTypographyProps={{ fontSize: '0.875rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
