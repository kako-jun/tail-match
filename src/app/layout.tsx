'use client';

import './globals.css';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ThemeRegistry from '@/components/ThemeRegistry';
import SpaceCatGame from '@/components/SpaceCatGame';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  Divider,
} from '@mui/material';
import { Menu } from '@mui/icons-material';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  return (
    <html lang="ja">
      <body>
        <ThemeRegistry>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header — Instagram-style minimal white bar */}
            <AppBar
              position="sticky"
              elevation={0}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                backdropFilter: 'saturate(180%) blur(20px)',
                borderBottom: '1px solid #DBDBDB',
                color: '#262626',
              }}
            >
              <Toolbar sx={{ minHeight: '54px !important', px: { xs: 2, md: 3 } }}>
                {/* Logo */}
                <Link
                  href="/"
                  style={{ textDecoration: 'none', color: 'inherit', marginRight: 'auto' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Image
                      src="/tail-match_logo.webp"
                      alt="ているまっち！"
                      width={180}
                      height={32}
                      priority
                      sizes="(max-width: 600px) 140px, 180px"
                      style={{ height: 'auto', width: '100%', maxWidth: 180 }}
                    />
                  </Box>
                </Link>

                {/* Desktop nav */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
                  <Button
                    component={Link}
                    href="/"
                    sx={{
                      color: '#262626',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      px: 1.5,
                      minWidth: 0,
                      '&:hover': { backgroundColor: '#F5F5F5' },
                    }}
                  >
                    ホーム
                  </Button>
                  <Button
                    component={Link}
                    href="/search"
                    sx={{
                      color: '#262626',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      px: 1.5,
                      minWidth: 0,
                      '&:hover': { backgroundColor: '#F5F5F5' },
                    }}
                  >
                    シッポを探す
                  </Button>
                  <Button
                    component={Link}
                    href="/gallery"
                    sx={{
                      color: '#262626',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      px: 1.5,
                      minWidth: 0,
                      '&:hover': { backgroundColor: '#F5F5F5' },
                    }}
                  >
                    ギャラリー
                  </Button>
                  <Button
                    component={Link}
                    href="/shelters"
                    sx={{
                      color: '#262626',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      px: 1.5,
                      minWidth: 0,
                      '&:hover': { backgroundColor: '#F5F5F5' },
                    }}
                  >
                    保護センター
                  </Button>
                </Box>

                {/* SpaceCat game */}
                <Box sx={{ ml: { xs: 'auto', md: 1 } }}>
                  <SpaceCatGame size="small" />
                </Box>

                {/* Mobile hamburger */}
                <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                  <IconButton
                    onClick={handleMobileMenuOpen}
                    sx={{ color: '#262626', p: 1 }}
                    aria-label="メニュー"
                  >
                    <Menu sx={{ fontSize: 22 }} />
                  </IconButton>
                </Box>

                {/* Mobile dropdown */}
                <MuiMenu
                  anchorEl={mobileMenuAnchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={handleMobileMenuClose}
                  PaperProps={{
                    sx: {
                      border: '1px solid #DBDBDB',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      borderRadius: '8px',
                      minWidth: 180,
                    },
                  }}
                  sx={{ display: { xs: 'block', md: 'none' } }}
                >
                  {[
                    { label: 'ホーム', href: '/' },
                    { label: 'シッポを探す', href: '/search' },
                    { label: 'ギャラリー', href: '/gallery' },
                    { label: '保護センター', href: '/shelters' },
                  ].map((item) => (
                    <MenuItem
                      key={item.href}
                      onClick={handleMobileMenuClose}
                      component={Link}
                      href={item.href}
                      sx={{
                        fontSize: '0.875rem',
                        color: '#262626',
                        py: 1.25,
                        px: 2,
                        '&:hover': { backgroundColor: '#F5F5F5' },
                      }}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </MuiMenu>
              </Toolbar>
            </AppBar>

            {/* Main */}
            <Box component="main" sx={{ flexGrow: 1, backgroundColor: '#FAFAFA' }}>
              {children}
            </Box>

            {/* Footer */}
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
                  <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E' }}>
                    © 2025 ているまっち！ by kako-jun
                  </Typography>
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
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
