import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Box, Typography, Button } from '@mui/material';
import StatsDisplay from '@/components/StatsDisplay';

export const metadata: Metadata = {
  title: 'サイトについて — ているまっち！',
  description:
    '「ているまっち！」は全国の自治体が公開している保護猫・犬情報を自動収集して一覧表示する非公式の情報提供サービスです。サイトの目的・免責・対応地域・法的文書の案内をまとめています。',
};

export default function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Page title */}
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '1.75rem', md: '2rem' },
              fontWeight: 300,
              color: '#262626',
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              mb: 1,
            }}
          >
            サイトについて
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E' }}>
            ているまっち！の目的・免責・対応地域
          </Typography>
        </Box>

        {/* サイト目的 */}
        <Box>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.375rem' },
              fontWeight: 300,
              color: '#262626',
              letterSpacing: '-0.01em',
              mb: 2,
            }}
          >
            このサイトについて
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: '#262626', lineHeight: 1.8 }}>
            全国の自治体が公開している保護猫・犬の情報を自動収集して一覧表示しています。
            譲渡のご相談は各保護センターへ直接ご連絡ください。
          </Typography>
        </Box>

        {/* 免責 */}
        <Box>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.375rem' },
              fontWeight: 300,
              color: '#262626',
              letterSpacing: '-0.01em',
              mb: 2,
            }}
          >
            免責について
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: '#262626', lineHeight: 1.8 }}>
            本サイトは個人が運営する非公式サービスです。情報提供のみを目的としており、
            掲載内容の正確性・最新性は保証できません。譲渡のお申し込みや詳細なお問い合わせは、
            必ず各保護センターへ直接ご連絡ください。
            なお、譲渡には各施設が定める条件（居住地、年齢、住環境など）があります。
            必ず各施設に直接ご確認ください。
          </Typography>
        </Box>

        {/* 統計 */}
        <Box>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.375rem' },
              fontWeight: 300,
              color: '#262626',
              letterSpacing: '-0.01em',
              mb: 3,
            }}
          >
            現在の掲載状況
          </Typography>
          <StatsDisplay />
        </Box>

        {/* 対応地域概要 */}
        <Box>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.375rem' },
              fontWeight: 300,
              color: '#262626',
              letterSpacing: '-0.01em',
              mb: 2,
            }}
          >
            対応地域
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: '#262626', lineHeight: 1.8, mb: 3 }}>
            順次対応地域を拡大しています。詳しくは保護センターの一覧をご覧ください。
          </Typography>
          <Button
            component={Link}
            href="/shelters"
            variant="outlined"
            sx={{
              fontSize: '0.875rem',
              borderColor: '#DBDBDB',
              color: '#262626',
              borderRadius: '8px',
              px: 2.5,
              py: 1,
              '&:hover': { borderColor: '#A8A8A8', backgroundColor: 'transparent' },
            }}
          >
            保護センターの一覧を見る
          </Button>
        </Box>

        {/* 法的文書 */}
        <Box>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.375rem' },
              fontWeight: 300,
              color: '#262626',
              letterSpacing: '-0.01em',
              mb: 2,
            }}
          >
            法的文書
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              border: '1px solid #DBDBDB',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            {[
              { label: '免責事項', href: '/legal/disclaimer' },
              { label: '利用規約', href: '/legal/terms' },
              { label: 'プライバシーポリシー', href: '/legal/privacy' },
            ].map((item, i, arr) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    fontSize: '0.9375rem',
                    color: '#262626',
                    borderBottom: i < arr.length - 1 ? '1px solid #EFEFEF' : 'none',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { backgroundColor: '#F5F5F5' },
                  }}
                >
                  {item.label}
                </Box>
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
