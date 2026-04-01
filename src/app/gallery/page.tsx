'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Dialog,
  DialogContent,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Close, LocationOn, AccessTime } from '@mui/icons-material';
import Link from 'next/link';
import type { TailWithDetails } from '@/types/database';

export default function GalleryPage() {
  const [animals, setAnimals] = useState<TailWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<TailWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [animalType, setAnimalType] = useState<'all' | 'cat' | 'dog'>('all');

  useEffect(() => {
    const fetchAnimals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '100', status: 'available' });
        if (animalType !== 'all') params.append('animal_type', animalType);

        const response = await fetch(`/api/tails?${params}`);
        const data = (await response.json()) as Record<string, any>;

        const animalsWithImages = (data.data || []).filter(
          (animal: TailWithDetails) => animal.images && animal.images.length > 0
        );
        setAnimals(animalsWithImages);
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnimals();
  }, [animalType]);

  const handleImageClick = (animal: TailWithDetails) => {
    setSelectedAnimal(animal);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedAnimal(null), 200);
  };

  const getUrgencyLevel = (deadlineDate: string | Date | undefined) => {
    if (!deadlineDate) return null;
    const daysRemaining = Math.ceil(
      (new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysRemaining <= 3) return 'urgent';
    if (daysRemaining <= 7) return 'warning';
    if (daysRemaining <= 14) return 'caution';
    return 'normal';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #DBDBDB' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '1.375rem',
                fontWeight: 300,
                color: '#262626',
                letterSpacing: '-0.01em',
              }}
            >
              ギャラリー
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E', mt: 0.5 }}>
              新しい家族を待っているシッポたちの写真集
            </Typography>
          </Box>

          {/* Filter tabs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              value={animalType}
              exclusive
              onChange={(_, value) => value && setAnimalType(value)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: '1px solid #DBDBDB',
                  borderRadius: '6px !important',
                  px: 2,
                  py: 0.75,
                  fontSize: '0.8125rem',
                  color: '#262626',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    backgroundColor: '#262626',
                    color: '#FFFFFF',
                    borderColor: '#262626',
                  },
                  '&:hover': { backgroundColor: '#F5F5F5' },
                },
              }}
            >
              <ToggleButton value="all">すべて</ToggleButton>
              <ToggleButton value="cat">🐱 猫</ToggleButton>
              <ToggleButton value="dog">🐶 犬</ToggleButton>
            </ToggleButtonGroup>

            {!loading && (
              <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E' }}>
                {animals.length}匹
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={24} thickness={2} sx={{ color: '#262626', mb: 2 }} />
            <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>読み込み中...</Typography>
          </Box>
        </Box>
      ) : animals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography sx={{ fontSize: '0.9375rem', color: '#8E8E8E' }}>
            表示できる画像がありません
          </Typography>
        </Box>
      ) : (
        /* Instagram square grid — strict 3px gap, squares */
        <Box
          sx={{
            display: 'grid',
            gap: '3px',
            gridTemplateColumns: {
              xs: 'repeat(3, 1fr)',
              sm: 'repeat(4, 1fr)',
              md: 'repeat(5, 1fr)',
              lg: 'repeat(6, 1fr)',
              xl: 'repeat(7, 1fr)',
            },
          }}
        >
          {animals.map((animal) => {
            const urgency = getUrgencyLevel(animal.deadline_date);
            const mainImage =
              Array.isArray(animal.images) && animal.images.length > 0 ? animal.images[0] : null;
            if (!mainImage) return null;

            return (
              <Box
                key={animal.id}
                onClick={() => handleImageClick(animal)}
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '100%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: '#EFEFEF',
                  borderRadius: '2px',
                }}
              >
                <img
                  src={mainImage}
                  alt={animal.name || '保護動物'}
                  loading="lazy"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    const fallback = img.parentElement?.querySelector(
                      '.img-fallback'
                    ) as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <Box
                  className="img-fallback"
                  sx={{
                    display: 'none',
                    position: 'absolute',
                    inset: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    backgroundColor: '#F5F5F5',
                  }}
                >
                  {animal.animal_type === 'dog' ? '🐶' : '🐱'}
                </Box>
                {/* Warm tint */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(135deg, rgba(255,200,150,0.07) 0%, rgba(255,240,210,0.03) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
                {/* Urgency badge */}
                {urgency === 'urgent' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 5,
                      left: 5,
                      zIndex: 3,
                      px: 1,
                      py: '2px',
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      borderRadius: '3px',
                      border: '1px solid #FFBEC2',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        color: '#ED4956',
                        lineHeight: 1.4,
                      }}
                    >
                      緊急
                    </Typography>
                  </Box>
                )}
                {/* Hover overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'all 0.15s ease',
                    zIndex: 4,
                    '&:hover': {
                      background: 'rgba(0,0,0,0.15)',
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Detail dialog — Instagram lightbox style */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            boxShadow: '0 4px 30px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          },
        }}
      >
        {selectedAnimal && (
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
              {/* Left: photo */}
              {selectedAnimal.images && selectedAnimal.images[0] && (
                <Box
                  sx={{
                    flex: { sm: '0 0 50%' },
                    position: 'relative',
                    minHeight: { xs: 260, sm: 420 },
                    backgroundColor: '#0A0A0A',
                  }}
                >
                  <img
                    src={selectedAnimal.images[0]}
                    alt={selectedAnimal.name || '保護動物'}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const fallback = img.parentElement?.querySelector(
                        '.img-fallback'
                      ) as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <Box
                    className="img-fallback"
                    sx={{
                      display: 'none',
                      position: 'absolute',
                      inset: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '6rem',
                      backgroundColor: '#1A1A1A',
                    }}
                  >
                    {selectedAnimal.animal_type === 'dog' ? '🐶' : '🐱'}
                  </Box>
                </Box>
              )}

              {/* Right: info */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid #EFEFEF',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#F5F5F5',
                      border: '1.5px solid #DBDBDB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    {selectedAnimal.animal_type === 'dog' ? '🐶' : '🐱'}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
                      {selectedAnimal.name || '名前未定'}
                    </Typography>
                    {selectedAnimal.municipality && (
                      <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
                        {selectedAnimal.region?.name} {selectedAnimal.municipality.name}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={handleCloseDialog} sx={{ color: '#262626' }}>
                    <Close sx={{ fontSize: 20 }} />
                  </IconButton>
                </Box>

                {/* Body */}
                <Box sx={{ flex: 1, p: 2.5, overflowY: 'auto' }}>
                  {/* Chips */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                    {selectedAnimal.gender && (
                      <Box
                        component="span"
                        sx={{
                          px: 1.5,
                          py: '3px',
                          borderRadius: '4px',
                          backgroundColor: '#F5F5F5',
                          fontSize: '0.75rem',
                          color: '#8E8E8E',
                          fontWeight: 500,
                        }}
                      >
                        {selectedAnimal.gender === 'male' ? 'オス' : 'メス'}
                      </Box>
                    )}
                    {selectedAnimal.age_estimate && (
                      <Box
                        component="span"
                        sx={{
                          px: 1.5,
                          py: '3px',
                          borderRadius: '4px',
                          backgroundColor: '#F5F5F5',
                          fontSize: '0.75rem',
                          color: '#8E8E8E',
                          fontWeight: 500,
                        }}
                      >
                        {selectedAnimal.age_estimate}
                      </Box>
                    )}
                    {selectedAnimal.breed && (
                      <Box
                        component="span"
                        sx={{
                          px: 1.5,
                          py: '3px',
                          borderRadius: '4px',
                          backgroundColor: '#F5F5F5',
                          fontSize: '0.75rem',
                          color: '#8E8E8E',
                          fontWeight: 500,
                        }}
                      >
                        {selectedAnimal.breed}
                      </Box>
                    )}
                    {selectedAnimal.color && (
                      <Box
                        component="span"
                        sx={{
                          px: 1.5,
                          py: '3px',
                          borderRadius: '4px',
                          backgroundColor: '#F5F5F5',
                          fontSize: '0.75rem',
                          color: '#8E8E8E',
                          fontWeight: 500,
                        }}
                      >
                        {selectedAnimal.color}
                      </Box>
                    )}
                  </Box>

                  {/* Personality */}
                  {selectedAnimal.personality && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#262626', lineHeight: 1.6 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {selectedAnimal.name || '名前未定'}{' '}
                        </Box>
                        {selectedAnimal.personality}
                      </Typography>
                    </Box>
                  )}

                  {/* Deadline */}
                  {selectedAnimal.deadline_date && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
                      <AccessTime sx={{ fontSize: 14, color: '#8E8E8E' }} />
                      <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E' }}>
                        期限 {new Date(selectedAnimal.deadline_date).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Box>
                  )}

                  {/* Location */}
                  {selectedAnimal.municipality && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 3 }}>
                      <LocationOn sx={{ fontSize: 14, color: '#8E8E8E' }} />
                      <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E' }}>
                        {selectedAnimal.region?.name} {selectedAnimal.municipality.name}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Actions */}
                <Box sx={{ borderTop: '1px solid #EFEFEF' }}>
                  <Box sx={{ px: 2, py: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      component={Link}
                      href={`/tails/${selectedAnimal.id}`}
                      sx={{
                        fontSize: '0.875rem',
                        py: 1,
                        backgroundColor: '#262626',
                        '&:hover': { backgroundColor: '#000000' },
                      }}
                    >
                      詳細を見る
                    </Button>
                    {selectedAnimal.source_url && (
                      <Button
                        variant="outlined"
                        fullWidth
                        href={selectedAnimal.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: '0.875rem',
                          py: 1,
                          borderColor: '#DBDBDB',
                          color: '#262626',
                          '&:hover': { borderColor: '#A8A8A8', backgroundColor: 'transparent' },
                        }}
                      >
                        施設サイト
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Container>
  );
}
