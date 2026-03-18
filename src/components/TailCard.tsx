'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TailWithDetails } from '@/types/database';
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
  Divider,
  IconButton,
} from '@mui/material';
import {
  AccessTime,
  LocationOn,
  FavoriteBorder,
  Favorite,
  BookmarkBorder,
  Visibility,
} from '@mui/icons-material';

interface TailCardProps {
  tail: TailWithDetails;
  showRegion?: boolean;
  viewMode?: 'instagram' | 'card';
}

export default function TailCard({ tail, showRegion = true, viewMode = 'card' }: TailCardProps) {
  const [imgError, setImgError] = useState(false);

  // Urgency badge label
  const formatDaysRemaining = () => {
    if (!tail.days_remaining) return null;
    if (tail.days_remaining < 0) return '期限切れ';
    if (tail.days_remaining === 0) return '今日まで';
    return `あと${tail.days_remaining}日`;
  };

  const imageUrl = tail.images && tail.images.length > 0 ? tail.images[0] : null;

  const getUrgencyBadgeClass = () => {
    switch (tail.urgency_level) {
      case 'urgent':
        return 'urgency-badge urgent';
      case 'warning':
        return 'urgency-badge warning';
      case 'caution':
        return 'urgency-badge caution';
      default:
        return null;
    }
  };

  const urgencyBadgeClass = getUrgencyBadgeClass();

  // ===== Instagram grid/square card =====
  if (viewMode === 'instagram') {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingBottom: '100%', // enforce 1:1
          overflow: 'hidden',
          borderRadius: '4px',
          backgroundColor: '#EFEFEF',
          cursor: 'pointer',
        }}
      >
        {/* Photo */}
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={tail.name || '保護動物'}
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              backgroundColor: '#F5F5F5',
              color: '#A8A8A8',
            }}
          >
            {tail.animal_type === 'dog' ? '🐶' : '🐱'}
          </Box>
        )}

        {/* Warm photo tint */}
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

        {/* Urgency badge — top left */}
        {urgencyBadgeClass && tail.days_remaining !== null && (
          <Box sx={{ position: 'absolute', top: 6, left: 6, zIndex: 3 }}>
            <span className={urgencyBadgeClass}>{formatDaysRemaining()}</span>
          </Box>
        )}

        {/* Transfer decided — top right */}
        {!!tail.transfer_decided && (
          <Box sx={{ position: 'absolute', top: 6, right: 6, zIndex: 3 }}>
            <Favorite
              sx={{
                fontSize: 18,
                color: '#ED4956',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
              }}
            />
          </Box>
        )}

        {/* Hover overlay */}
        <Box
          className="ig-overlay"
          component={Link}
          href={`/tails/${tail.id}`}
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            opacity: 0,
            transition: 'all 0.15s ease',
            zIndex: 4,
            textDecoration: 'none',
            '&:hover': {
              background: 'rgba(0,0,0,0.3)',
              opacity: 1,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            <FavoriteBorder sx={{ fontSize: 22 }} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            <Visibility sx={{ fontSize: 22 }} />
          </Box>
        </Box>
      </Box>
    );
  }

  // ===== Feed card (below grid, Instagram feed post style) =====
  return (
    <Card
      sx={{
        border: '1px solid #DBDBDB',
        borderRadius: '8px',
        boxShadow: 'none',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Card header: avatar + name + location */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 1.5 }}>
        <Avatar
          src={imageUrl || undefined}
          sx={{
            width: 36,
            height: 36,
            border: '1.5px solid #DBDBDB',
            fontSize: '1.25rem',
            backgroundColor: '#F5F5F5',
          }}
        >
          {tail.animal_type === 'dog' ? '🐶' : '🐱'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: '#262626', lineHeight: 1.3 }}
            noWrap
          >
            {tail.name || '名前未定'}
          </Typography>
          {showRegion && (
            <Typography variant="caption" sx={{ color: '#8E8E8E', lineHeight: 1.2 }}>
              {tail.region?.name} {tail.municipality?.name}
            </Typography>
          )}
        </Box>
        {/* Urgency badge */}
        {urgencyBadgeClass && tail.days_remaining !== null && (
          <span className={urgencyBadgeClass}>
            <AccessTime sx={{ fontSize: 12 }} />
            {formatDaysRemaining()}
          </span>
        )}
      </Box>

      {/* Square photo */}
      <Box
        component={Link}
        href={`/tails/${tail.id}`}
        sx={{
          display: 'block',
          width: '100%',
          paddingBottom: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#EFEFEF',
        }}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={tail.name || '保護動物'}
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              color: '#C7C7C7',
            }}
          >
            {tail.animal_type === 'dog' ? '🐶' : '🐱'}
          </Box>
        )}
        {/* Warm tint */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(255,200,150,0.07) 0%, rgba(255,240,210,0.03) 100%)',
            pointerEvents: 'none',
          }}
        />
        {/* Transfer decided overlay badge */}
        {!!tail.transfer_decided && (
          <Chip
            icon={<Favorite sx={{ fontSize: '14px !important', color: '#ED4956 !important' }} />}
            label="譲渡決定"
            size="small"
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: 'rgba(255,255,255,0.92)',
              border: '1px solid #DBDBDB',
              fontSize: '0.6875rem',
              fontWeight: 600,
              height: 24,
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </Box>

      {/* Action bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, pt: 1, pb: 0.5 }}>
        <IconButton size="small" sx={{ color: '#262626', p: '8px' }}>
          <FavoriteBorder sx={{ fontSize: 24 }} />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" sx={{ color: '#262626', p: '8px' }}>
          <BookmarkBorder sx={{ fontSize: 24 }} />
        </IconButton>
      </Box>

      {/* Metadata */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        {/* Breed / age / gender chips */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
          {tail.breed && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                px: '8px',
                py: '2px',
                borderRadius: '4px',
                backgroundColor: '#F5F5F5',
                fontSize: '0.6875rem',
                color: '#8E8E8E',
                fontWeight: 500,
              }}
            >
              {tail.breed}
            </Box>
          )}
          {tail.age_estimate && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                px: '8px',
                py: '2px',
                borderRadius: '4px',
                backgroundColor: '#F5F5F5',
                fontSize: '0.6875rem',
                color: '#8E8E8E',
                fontWeight: 500,
              }}
            >
              {tail.age_estimate}
            </Box>
          )}
          {tail.gender && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                px: '8px',
                py: '2px',
                borderRadius: '4px',
                backgroundColor: '#F5F5F5',
                fontSize: '0.6875rem',
                color: '#8E8E8E',
                fontWeight: 500,
              }}
            >
              {tail.gender === 'male' ? 'オス' : tail.gender === 'female' ? 'メス' : '性別不明'}
            </Box>
          )}
        </Box>

        {/* Personality snippet */}
        {tail.personality && (
          <Typography
            variant="body2"
            sx={{ fontSize: '0.8125rem', color: '#262626', lineHeight: 1.5, mb: 1 }}
            className="line-clamp-2"
          >
            <Box component="span" sx={{ fontWeight: 600 }}>
              {tail.name || '名前未定'}{' '}
            </Box>
            {tail.personality}
          </Typography>
        )}

        {/* Deadline */}
        {tail.deadline_date && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <AccessTime sx={{ fontSize: 13, color: '#8E8E8E' }} />
            <Typography variant="caption" sx={{ color: '#8E8E8E' }}>
              期限 {new Date(tail.deadline_date).toLocaleDateString('ja-JP')}
            </Typography>
          </Box>
        )}

        {/* CTA */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          <Button
            component={Link}
            href={`/tails/${tail.id}`}
            variant="contained"
            size="small"
            sx={{
              flex: 1,
              fontSize: '0.8rem',
              py: 0.75,
              backgroundColor: '#262626',
              '&:hover': { backgroundColor: '#000' },
            }}
          >
            詳細を見る
          </Button>
          {tail.source_url && (
            <Button
              href={tail.source_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              sx={{
                fontSize: '0.8rem',
                py: 0.75,
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
    </Card>
  );
}
