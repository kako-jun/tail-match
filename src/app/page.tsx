'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import TailCard from '@/components/TailCard';
import type { TailWithDetails } from '@/types/database';

export default function HomePage() {
  const [tails, setTails] = useState<TailWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalType, setAnimalType] = useState<'all' | 'cat' | 'dog'>('all');

  useEffect(() => {
    const fetchTails = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '60',
          status: 'available',
          sort_by: 'deadline_date',
          sort_order: 'asc',
        });
        if (animalType !== 'all') params.set('animal_type', animalType);

        const response = await fetch(`/api/tails?${params.toString()}`);
        const data = (await response.json()) as {
          success: boolean;
          data: TailWithDetails[];
        };
        if (data.success) {
          setTails(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch tails:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTails();
  }, [animalType]);

  return (
    <>
      {/* 1-line disclaimer bar */}
      <Box
        sx={{
          backgroundColor: '#FAFAFA',
          borderBottom: '1px solid #EFEFEF',
          py: 1,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
          このサイトは非公式です。
          <Link href="/about" style={{ color: '#262626', marginLeft: '4px' }}>
            サイトについて
          </Link>
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 1, md: 3 }, py: { xs: 2, md: 3 } }}>
        {/* Filter bar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: { xs: 2, md: 3 },
            px: { xs: 1, md: 0 },
          }}
        >
          <ToggleButtonGroup
            value={animalType}
            exclusive
            onChange={(_, value) => value && setAnimalType(value)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                border: '1px solid #DBDBDB',
                borderRadius: '16px !important',
                px: 1.75,
                py: 0.5,
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: '#262626',
                textTransform: 'none',
                transition: 'all 0.15s ease',
                mr: 1,
                '&:last-of-type': { mr: 0 },
                '&.Mui-selected': {
                  backgroundColor: '#262626',
                  color: '#FFFFFF',
                  borderColor: '#262626',
                },
                '&:hover': { backgroundColor: '#F5F5F5' },
                '&.Mui-selected:hover': { backgroundColor: '#000000' },
              },
            }}
          >
            <ToggleButton value="all">すべて</ToggleButton>
            <ToggleButton value="cat">猫</ToggleButton>
            <ToggleButton value="dog">犬</ToggleButton>
          </ToggleButtonGroup>

          {!loading && (
            <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
              {tails.length}匹 （期限が近い順）
            </Typography>
          )}
        </Box>

        {/* Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={24} thickness={2} sx={{ color: '#262626' }} />
          </Box>
        ) : tails.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ fontSize: '0.9375rem', color: '#8E8E8E' }}>
              表示できるシッポたちがいません
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E', mt: 1.5 }}>
              詳しくは{' '}
              <Link href="/about" style={{ color: '#262626', textDecoration: 'underline' }}>
                サイトについて
              </Link>{' '}
              をご覧ください
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: { xs: '3px', sm: '4px' },
              gridTemplateColumns: {
                xs: 'repeat(3, 1fr)',
                sm: 'repeat(4, 1fr)',
                md: 'repeat(5, 1fr)',
                lg: 'repeat(6, 1fr)',
              },
            }}
          >
            {tails.map((tail) => (
              <TailCard key={tail.id} tail={tail} showRegion={true} viewMode="instagram" />
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
