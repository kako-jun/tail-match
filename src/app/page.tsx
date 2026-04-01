'use client';

import { useState } from 'react';
import Link from 'next/link';
import TailGrid from '@/components/TailGrid';
import StatsDisplay from '@/components/StatsDisplay';
import { Container, Box, Typography, FormControl, Select, MenuItem, Button } from '@mui/material';
import { Search } from '@mui/icons-material';

const selectSx = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#DBDBDB',
    borderWidth: 1,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#A8A8A8' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#262626',
    borderWidth: 1,
  },
  '& .MuiSelect-select': { padding: '10px 14px', color: '#262626' },
};

export default function HomePage() {
  const [searchRegion, setSearchRegion] = useState('');
  const [searchGender, setSearchGender] = useState('');
  const [searchAge, setSearchAge] = useState('');
  const [searchBreed, setSearchBreed] = useState('');

  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    if (searchRegion) params.set('region', searchRegion);
    if (searchGender) params.set('gender', searchGender);
    if (searchAge) params.set('age', searchAge);
    if (searchBreed) params.set('breed', searchBreed);
    const qs = params.toString();
    return `/search${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      {/* Hero — gradient with message */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          py: { xs: 6, sm: 8, md: 10 },
          px: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 50%, rgba(255,200,150,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <Typography
          sx={{
            position: 'relative',
            color: 'white',
            fontWeight: 300,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            mb: 1.5,
          }}
        >
          1匹でも多くの命を、家族へ
        </Typography>
        <Typography
          sx={{
            position: 'relative',
            color: 'rgba(255,255,255,0.7)',
            fontSize: { xs: '0.875rem', md: '1.125rem' },
            fontWeight: 300,
            maxWidth: 560,
            mx: 'auto',
            lineHeight: 1.7,
          }}
        >
          全国の自治体が保護している猫・犬の情報を集約。
          <br />
          あなたとシッポたちの出会いをサポートします。
        </Typography>
        <Button
          component={Link}
          href="/search"
          variant="contained"
          startIcon={<Search sx={{ fontSize: 18 }} />}
          sx={{
            position: 'relative',
            mt: 3,
            px: 4,
            py: 1.25,
            fontSize: '0.9375rem',
            fontWeight: 600,
            backgroundColor: 'rgba(255,255,255,0.95)',
            color: '#1a1a2e',
            '&:hover': { backgroundColor: '#FFFFFF' },
          }}
        >
          シッポたちを探す
        </Button>
      </Box>

      {/* Disclaimer banner */}
      <Box
        sx={{
          backgroundColor: '#F5F5F5',
          borderBottom: '1px solid #EFEFEF',
          py: 1.25,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
          本サイトは個人運営の非公式サービスです。各自治体の公開情報を自動収集しています。
          情報の正確性は保証できません。
          <Link href="/legal/disclaimer" style={{ color: '#262626', marginLeft: '4px' }}>
            免責事項
          </Link>
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, py: 5 }}>
        {/* Notice — minimal card */}
        <Box
          sx={{
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            p: { xs: 3, md: 4 },
            mb: 5,
            maxWidth: 800,
            mx: 'auto',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: '#8E8E8E',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 1.5,
            }}
          >
            はじめにお読みください
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: '#262626', lineHeight: 1.7, mb: 1.5 }}>
            <strong>「ているまっち！」</strong>は、全国の自治体が保護している猫・犬の情報を集約し、
            新しい家族とのマッチングをサポートするサービスです。
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.7, mb: 1.5 }}>
            このサイトは情報提供のみを行っています。譲渡のお申し込みや詳細なお問い合わせは、
            各保護センターへ直接ご連絡ください。
          </Typography>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              backgroundColor: '#FFEEF0',
              borderRadius: '6px',
              border: '1px solid #FFBEC2',
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', color: '#ED4956', lineHeight: 1.6 }}>
              シッポたちは、期限が過ぎると<strong>殺処分</strong>の可能性があります。
              一匹でも多くの命を救うため、ぜひ里親をご検討ください。
            </Typography>
          </Box>
        </Box>

        {/* Urgent section */}
        <Box sx={{ mb: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1.5,
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #DBDBDB',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626' }}>
              緊急のシッポたち
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.25,
                borderRadius: '20px',
                backgroundColor: '#FFEEF0',
                border: '1px solid #FFBEC2',
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', color: '#ED4956', fontWeight: 700 }}>
                残り時間わずか
              </Typography>
            </Box>
          </Box>
          <TailGrid showUrgentOnly={true} maxCount={12} />
        </Box>

        {/* Warning section (要注意) */}
        <Box sx={{ mb: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1.5,
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #DBDBDB',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626' }}>
              要注意のシッポたち
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.25,
                borderRadius: '20px',
                backgroundColor: '#FFF8E6',
                border: '1px solid #FFE299',
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', color: '#B07D00', fontWeight: 700 }}>
                残り1週間以内
              </Typography>
            </Box>
          </Box>
          <TailGrid
            searchParams={{
              urgency_days: 7,
              urgency_days_min: 3,
              sort_by: 'deadline_date',
              sort_order: 'asc',
            }}
            maxCount={12}
          />
        </Box>

        {/* Search section */}
        <Box
          sx={{
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            p: { xs: 3, md: 4 },
            mb: 6,
            maxWidth: 800,
            mx: 'auto',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#8E8E8E',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                mb: 0.5,
              }}
            >
              シッポたちを探す
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E' }}>
              条件を選んで気になるシッポを見つけよう
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Region */}
            <FormControl fullWidth>
              <Select
                displayEmpty
                value={searchRegion}
                onChange={(e) => setSearchRegion(e.target.value)}
                sx={selectSx}
              >
                <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>
                  地域を選択
                </MenuItem>
                <MenuItem value="hokkaido" sx={{ fontSize: '0.875rem' }}>
                  北海道
                </MenuItem>
                <MenuItem value="tohoku" sx={{ fontSize: '0.875rem' }}>
                  東北
                </MenuItem>
                <MenuItem value="kanto" sx={{ fontSize: '0.875rem' }}>
                  関東
                </MenuItem>
                <MenuItem value="chubu" sx={{ fontSize: '0.875rem' }}>
                  中部
                </MenuItem>
                <MenuItem value="kansai" sx={{ fontSize: '0.875rem' }}>
                  関西
                </MenuItem>
                <MenuItem value="chugoku" sx={{ fontSize: '0.875rem' }}>
                  中国
                </MenuItem>
                <MenuItem value="shikoku" sx={{ fontSize: '0.875rem' }}>
                  四国
                </MenuItem>
                <MenuItem value="kyushu" sx={{ fontSize: '0.875rem' }}>
                  九州・沖縄
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ flex: 1, minWidth: 120 }}>
                <Select
                  displayEmpty
                  value={searchGender}
                  onChange={(e) => setSearchGender(e.target.value)}
                  sx={selectSx}
                >
                  <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>
                    性別
                  </MenuItem>
                  <MenuItem value="male" sx={{ fontSize: '0.875rem' }}>
                    オス
                  </MenuItem>
                  <MenuItem value="female" sx={{ fontSize: '0.875rem' }}>
                    メス
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 120 }}>
                <Select
                  displayEmpty
                  value={searchAge}
                  onChange={(e) => setSearchAge(e.target.value)}
                  sx={selectSx}
                >
                  <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>
                    年齢
                  </MenuItem>
                  <MenuItem value="子猫" sx={{ fontSize: '0.875rem' }}>
                    子猫
                  </MenuItem>
                  <MenuItem value="成猫" sx={{ fontSize: '0.875rem' }}>
                    成猫
                  </MenuItem>
                  <MenuItem value="シニア猫" sx={{ fontSize: '0.875rem' }}>
                    シニア猫
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 120 }}>
                <Select
                  displayEmpty
                  value={searchBreed}
                  onChange={(e) => setSearchBreed(e.target.value)}
                  sx={selectSx}
                >
                  <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>
                    猫種
                  </MenuItem>
                  <MenuItem value="ミックス" sx={{ fontSize: '0.875rem' }}>
                    ミックス
                  </MenuItem>
                  <MenuItem value="ペルシャ" sx={{ fontSize: '0.875rem' }}>
                    ペルシャ
                  </MenuItem>
                  <MenuItem value="シャム" sx={{ fontSize: '0.875rem' }}>
                    シャム
                  </MenuItem>
                  <MenuItem value="メインクーン" sx={{ fontSize: '0.875rem' }}>
                    メインクーン
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button
              component={Link}
              href={buildSearchUrl()}
              variant="contained"
              startIcon={<Search sx={{ fontSize: 18 }} />}
              sx={{
                py: 1.25,
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: '#262626',
                '&:hover': { backgroundColor: '#000000' },
              }}
            >
              シッポたちを探す
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ mb: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              mb: 3,
              pb: 2,
              borderBottom: '1px solid #DBDBDB',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626' }}>
              リアルタイム統計
            </Typography>
          </Box>
          <StatsDisplay />
        </Box>

        {/* News */}
        <Box sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
          <Box
            sx={{
              pb: 2,
              mb: 3,
              borderBottom: '1px solid #DBDBDB',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#262626' }}>
              お知らせ
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              {
                date: '2024.06.30',
                title: 'Phase 3 UI/UX完成',
                body: '検索・フィルタリング機能、緊急度表示システム、統計ダッシュボードが完成しました。',
                tag: '新機能',
                tagColor: '#4CAF50',
                tagBg: '#F0FFF4',
                tagBorder: '#A5D6A7',
              },
              {
                date: '準備中',
                title: '自治体連携拡大中',
                body: '全国の自治体との連携を順次開始いたします。石川県に続き、他の都道府県も追加予定です。',
                tag: '予定',
                tagColor: '#1565C0',
                tagBg: '#EEF5FF',
                tagBorder: '#BBDEFB',
              },
            ].map((item, i, arr) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  gap: 3,
                  py: 3,
                  borderBottom: i < arr.length - 1 ? '1px solid #EFEFEF' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '4px',
                    backgroundColor: item.tagBg,
                    border: `1px solid ${item.tagBorder}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: item.tagColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.date}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#262626', mb: 0.5 }}
                  >
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.6 }}>
                    {item.body}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </>
  );
}
