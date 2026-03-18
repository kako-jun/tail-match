'use client';

export const runtime = 'edge';

import { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container, Box, Typography, Button, CircularProgress, Chip, Divider } from '@mui/material';
import { AccessTime, LocationOn, Phone, OpenInNew, ArrowBack, Favorite } from '@mui/icons-material';
import { TailWithDetails } from '@/types/database';

interface TailDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TailDetailPage({ params }: TailDetailPageProps) {
  const [tail, setTail] = useState<TailWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedParams = use(params);
  const id = parseInt(resolvedParams.id);

  useEffect(() => {
    if (isNaN(id)) {
      setError('Invalid ID');
      setLoading(false);
      return;
    }

    const fetchTail = async () => {
      try {
        const response = await fetch(`/api/tails/${id}`);
        const data = (await response.json()) as Record<string, any>;

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tail');
        }

        if (data.success) {
          setTail(data.data);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Failed to fetch tail:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTail();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
            <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>読み込み中...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#ED4956', mb: 2 }}>{error}</Typography>
            <Button
              component={Link}
              href="/tails"
              variant="outlined"
              startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
              sx={{ borderColor: '#DBDBDB', color: '#262626' }}
            >
              一覧に戻る
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!tail) {
    notFound();
  }

  // Urgency styling
  const getUrgencySx = () => {
    switch (tail.urgency_level) {
      case 'urgent':
        return { backgroundColor: '#FFEEF0', color: '#ED4956', border: '1px solid #FFBEC2' };
      case 'warning':
        return { backgroundColor: '#FFF8E6', color: '#B07D00', border: '1px solid #FFE299' };
      case 'caution':
        return { backgroundColor: '#FFF3CD', color: '#856404', border: '1px solid #FFE69C' };
      default:
        return { backgroundColor: '#F5F5F5', color: '#262626', border: '1px solid #EFEFEF' };
    }
  };

  const formatDaysRemaining = () => {
    if (tail.days_remaining == null) return null;
    if (tail.days_remaining < 0) return '期限切れ';
    if (tail.days_remaining === 0) return '今日まで！';
    return `あと${tail.days_remaining}日`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back button */}
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/search"
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          sx={{ color: '#262626', fontSize: '0.875rem', '&:hover': { backgroundColor: '#F5F5F5' } }}
        >
          シッポたち一覧に戻る
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        }}
      >
        {/* Image area */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Main image */}
          <Box
            sx={{
              aspectRatio: '1 / 1',
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#EFEFEF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #DBDBDB',
            }}
          >
            {tail.images && tail.images.length > 0 ? (
              <img
                src={tail.images[0]}
                alt={tail.name || '保護猫'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText =
                      'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:8rem;opacity:0.6';
                    placeholder.textContent = '\uD83D\uDC31';
                    parent.appendChild(placeholder);
                  }
                }}
              />
            ) : (
              <Typography sx={{ fontSize: '8rem', opacity: 0.6 }}>{'\uD83D\uDC31'}</Typography>
            )}

            {/* Transfer decided badge */}
            {!!tail.transfer_decided && (
              <Chip
                icon={<Favorite sx={{ fontSize: 14, color: '#FFFFFF !important' }} />}
                label="譲渡決定済み"
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  backgroundColor: '#4CAF50',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                }}
              />
            )}
          </Box>

          {/* Additional images */}
          {tail.images && tail.images.length > 1 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {tail.images.slice(1, 4).map((img, index) => (
                <Box
                  key={index}
                  sx={{
                    aspectRatio: '1 / 1',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#EFEFEF',
                    border: '1px solid #EFEFEF',
                  }}
                >
                  <img
                    src={img}
                    alt={`${tail.name || '保護猫'} 追加画像 ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/no-image-cat.svg';
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Detail info area */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic info card */}
          <Box
            sx={{
              border: '1px solid #DBDBDB',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              p: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: '1.5rem',
                fontWeight: 300,
                color: '#262626',
                mb: 2,
                letterSpacing: '-0.01em',
              }}
            >
              {tail.name || '名前未定'}
            </Typography>

            {/* Urgency display */}
            {tail.urgency_level !== 'normal' && tail.deadline_date && (
              <Box sx={{ p: 2, borderRadius: '6px', mb: 3, ...getUrgencySx() }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    期限: {new Date(tail.deadline_date).toLocaleDateString('ja-JP')}
                    {tail.days_remaining !== null && ` (${formatDaysRemaining()})`}
                  </Typography>
                </Box>
                {tail.urgency_level === 'urgent' && (
                  <Typography sx={{ fontSize: '0.8125rem', mt: 1 }}>
                    非常に緊急です！すぐにお問い合わせください
                  </Typography>
                )}
              </Box>
            )}

            {/* Basic data */}
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#8E8E8E',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    mb: 1.5,
                  }}
                >
                  基本情報
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { label: '品種', value: tail.breed || 'ミックス' },
                    { label: '年齢', value: tail.age_estimate || '不明' },
                    {
                      label: '性別',
                      value:
                        tail.gender === 'male'
                          ? 'オス'
                          : tail.gender === 'female'
                            ? 'メス'
                            : '不明',
                    },
                    { label: '毛色', value: tail.color || '詳細不明' },
                    ...(tail.size ? [{ label: 'サイズ', value: tail.size }] : []),
                  ].map((item) => (
                    <Box key={item.label} sx={{ display: 'flex', gap: 1, fontSize: '0.875rem' }}>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#262626',
                          minWidth: 60,
                        }}
                      >
                        {item.label}:
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#8E8E8E',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    mb: 1.5,
                  }}
                >
                  保護情報
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
                  >
                    <LocationOn sx={{ fontSize: 14, color: '#8E8E8E' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
                      {tail.region?.name} / {tail.municipality?.name}
                    </Typography>
                  </Box>
                  {tail.protection_date && (
                    <Box sx={{ display: 'flex', gap: 1, fontSize: '0.875rem' }}>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#262626',
                          minWidth: 60,
                        }}
                      >
                        保護日:
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
                        {new Date(tail.protection_date).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, fontSize: '0.875rem' }}>
                    <Typography
                      sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', minWidth: 80 }}
                    >
                      ステータス:
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        ...(tail.transfer_decided
                          ? { color: '#4CAF50', fontWeight: 700 }
                          : { color: '#8E8E8E' }),
                      }}
                    >
                      {tail.transfer_decided ? '譲渡決定済み' : '家族募集中'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Health / personality */}
          {(tail.health_status || tail.personality || tail.special_needs) && (
            <Box
              sx={{
                border: '1px solid #DBDBDB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                p: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mb: 2,
                }}
              >
                詳細情報
              </Typography>

              {tail.health_status && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 0.5 }}
                  >
                    健康状態
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.6 }}>
                    {tail.health_status}
                  </Typography>
                </Box>
              )}

              {tail.personality && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 0.5 }}
                  >
                    性格
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.6 }}>
                    {tail.personality}
                  </Typography>
                </Box>
              )}

              {tail.special_needs && (
                <Box>
                  <Typography
                    sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 0.5 }}
                  >
                    特別なケア
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.6 }}>
                    {tail.special_needs}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Contact info */}
          <Box
            sx={{
              border: '1px solid #DBDBDB',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              p: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#8E8E8E',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 2,
              }}
            >
              お問い合わせ先
            </Typography>

            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#262626', mb: 1.5 }}>
              {tail.municipality?.name}
            </Typography>

            {tail.municipality?.contact_info && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {tail.municipality.contact_info.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone sx={{ fontSize: 14, color: '#8E8E8E' }} />
                    <Typography
                      component="a"
                      href={`tel:${tail.municipality.contact_info.phone}`}
                      sx={{
                        fontSize: '0.875rem',
                        color: '#262626',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {tail.municipality.contact_info.phone}
                    </Typography>
                  </Box>
                )}
                {tail.municipality.contact_info.address && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <LocationOn sx={{ fontSize: 14, color: '#8E8E8E', mt: '2px' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E', lineHeight: 1.5 }}>
                      {tail.municipality.contact_info.address}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Source URL link */}
            {tail.source_url && (
              <>
                <Divider sx={{ borderColor: '#EFEFEF', my: 2 }} />
                <Button
                  href={tail.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                  sx={{
                    fontSize: '0.8125rem',
                    borderColor: '#DBDBDB',
                    color: '#262626',
                    '&:hover': { borderColor: '#A8A8A8', backgroundColor: 'transparent' },
                  }}
                >
                  元の掲載ページを見る
                </Button>
              </>
            )}
          </Box>

          {/* Disclaimer */}
          <Box
            sx={{
              p: 2.5,
              backgroundColor: '#FAFAFA',
              borderRadius: '8px',
              border: '1px solid #EFEFEF',
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626', mb: 1 }}>
              重要な注意事項
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {[
                '譲渡には条件がある場合があります',
                '必ず事前に自治体にお問い合わせください',
                '情報は変更される可能性があります',
                'このサイトは情報提供のみを行っています',
              ].map((text) => (
                <Typography
                  key={text}
                  component="li"
                  sx={{ fontSize: '0.8125rem', color: '#8E8E8E', lineHeight: 1.7 }}
                >
                  {text}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
