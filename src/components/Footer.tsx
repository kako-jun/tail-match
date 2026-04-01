'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Typography, Container, Box, Divider } from '@mui/material';
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

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #DBDBDB',
        mt: 6,
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(3, 1fr)',
            },
            mb: 4,
          }}
        >
          {/* Brand */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: '#262626', mb: 1, fontSize: '0.9375rem' }}
            >
              ているまっち！
            </Typography>
            <Typography variant="body2" sx={{ color: '#8E8E8E', lineHeight: 1.7 }}>
              1匹でも多くのシッポを救うために。
              <br />
              全国の保護シッポ情報をお届けします。
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#8E8E8E', lineHeight: 1.7, mt: 1.5, fontSize: '0.75rem' }}
            >
              本サイトは個人が運営する非公式サービスです。各自治体が公開している情報を自動収集して掲載しています。
              掲載情報の正確性は保証できません。譲渡をご希望の方は必ず各自治体に直接ご確認ください。
              詳しくは
              <Link
                href="/legal/disclaimer"
                style={{ color: '#262626', textDecoration: 'underline' }}
              >
                免責事項
              </Link>
              をご覧ください。
            </Typography>
          </Box>

          {/* Sitemap */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: '#262626', mb: 1.5, fontSize: '0.8125rem' }}
            >
              サイトマップ
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'ホーム', href: '/' },
                { label: 'シッポを探す', href: '/search' },
                { label: 'ギャラリー', href: '/gallery' },
                { label: '保護センター', href: '/shelters' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#8E8E8E',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </Box>
          </Box>

          {/* Contact */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: '#262626', mb: 1.5, fontSize: '0.8125rem' }}
            >
              お問い合わせ
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#8E8E8E', lineHeight: 1.7, mb: 2, fontSize: '0.8125rem' }}
            >
              このサイトは情報提供のみです。
              <br />
              譲渡は各自治体へ直接お問い合わせください。
            </Typography>
            <Link
              href="https://llll-ll.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8125rem',
                color: '#262626',
                textDecoration: 'none',
                fontWeight: 600,
                borderBottom: '1px solid #262626',
                paddingBottom: '1px',
              }}
            >
              llll-ll.com
            </Link>
          </Box>
        </Box>

        <Divider sx={{ borderColor: '#EFEFEF', mb: 3 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
              &copy; 2026 ているまっち！ by kako-jun
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
          <Box sx={{ display: 'flex', gap: 3 }}>
            {[
              { label: 'プライバシーポリシー', href: '/legal/privacy' },
              { label: '利用規約', href: '/legal/terms' },
              { label: '免責事項', href: '/legal/disclaimer' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: '0.75rem',
                  color: '#8E8E8E',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
