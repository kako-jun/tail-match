'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TailGrid from '@/components/TailGrid';
import StatsDisplay from '@/components/StatsDisplay';
import {
  Container,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  IconButton,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Search } from '@mui/icons-material';

const heroImages = [
  {
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1400&h=500&fit=crop&auto=format',
    title: '幸せな家族を待つシッポたち',
    subtitle: '温かい家庭で愛情をもらえる日を夢見ています',
  },
  {
    url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1400&h=500&fit=crop&auto=format',
    title: '愛らしい表情のシッポたち',
    subtitle: 'あなたとの出会いを心待ちにしています',
  },
  {
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1400&h=500&fit=crop&auto=format',
    title: '元気いっぱいのシッポたち',
    subtitle: '新しい家族との楽しい毎日を夢見ています',
  },
];

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
  const [currentSlide, setCurrentSlide] = useState(0);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  return (
    <>
      {/* Hero carousel — clean, photo-first */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: '260px', sm: '340px', md: '420px' },
          overflow: 'hidden',
          backgroundColor: '#EFEFEF',
        }}
      >
        {heroImages.map((image, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${image.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'opacity 1s ease-in-out',
              opacity: index === currentSlide ? 1 : 0,
            }}
          />
        ))}

        {/* Subtle warm overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)',
            zIndex: 1,
          }}
        />

        {/* Caption */}
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 32, md: 48 },
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 2,
            px: 3,
          }}
        >
          <Typography
            sx={{
              color: 'white',
              fontWeight: 300,
              fontSize: { xs: '1.25rem', md: '1.75rem' },
              letterSpacing: '-0.01em',
              textShadow: '0 1px 4px rgba(0,0,0,0.4)',
              mb: 0.75,
            }}
          >
            {heroImages[currentSlide].title}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: { xs: '0.875rem', md: '1rem' },
              fontWeight: 300,
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {heroImages[currentSlide].subtitle}
          </Typography>
        </Box>

        {/* Carousel controls */}
        <IconButton
          onClick={prevSlide}
          sx={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            backgroundColor: 'rgba(255,255,255,0.8)',
            color: '#262626',
            width: 32,
            height: 32,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
          }}
        >
          <ChevronLeft sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          onClick={nextSlide}
          sx={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 3,
            backgroundColor: 'rgba(255,255,255,0.8)',
            color: '#262626',
            width: 32,
            height: 32,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
          }}
        >
          <ChevronRight sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Dot indicators */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 0.75,
            zIndex: 3,
          }}
        >
          {heroImages.map((_, index) => (
            <Box
              key={index}
              onClick={() => setCurrentSlide(index)}
              sx={{
                width: index === currentSlide ? 20 : 6,
                height: 6,
                borderRadius: '3px',
                backgroundColor: index === currentSlide ? 'white' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Box>
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
            <strong>「ているまっち！」</strong>は、全国の自治体が保護している犬・猫の情報を集約し、
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
              保護動物たちは、期限が過ぎると<strong>殺処分</strong>の可能性があります。
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
