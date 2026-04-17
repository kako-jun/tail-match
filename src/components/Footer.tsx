'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Typography, Container, Box } from '@mui/material';
import { Update } from '@mui/icons-material';

export default function Footer() {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastUpdate = async () => {
      try {
        const response = await fetch('/api/scraping-stats');
        const data = (await response.json()) as Record<string, any>;
        if (data.success && data.data?.last_run) {
          setLastUpdate(data.data.last_run);
        }
      } catch {
        // Silently ignore — non-critical info
      }
    };
    fetchLastUpdate();
  }, []);

  const formatLastUpdate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    });
  };

  const legalLinks = [
    { label: 'サイトについて', href: '/about' },
    { label: '免責事項', href: '/legal/disclaimer' },
    { label: '利用規約', href: '/legal/terms' },
    { label: 'プライバシーポリシー', href: '/legal/privacy' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #DBDBDB',
        mt: 6,
        py: { xs: 4, md: 5 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            textAlign: 'center',
          }}
        >
          {/* Legal links */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 2, md: 3 },
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: '0.875rem',
                  color: '#8E8E8E',
                  textDecoration: 'none',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {item.label}
              </Link>
            ))}
          </Box>

          {/* llll-ll link */}
          <Link
            href="https://llll-ll.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              color: '#262626',
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: '1px solid #262626',
              paddingBottom: '1px',
            }}
          >
            llll-ll.com
          </Link>

          {/* Copyright & last update */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: { xs: 0.75, md: 2 },
              mt: 1,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
              © ているまっち！ by llll-ll
            </Typography>
            {lastUpdate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Update sx={{ fontSize: 12, color: '#A8A8A8' }} />
                <Typography sx={{ fontSize: '0.6875rem', color: '#A8A8A8' }}>
                  データ最終更新: {formatLastUpdate(lastUpdate)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
