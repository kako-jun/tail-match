'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { AppBar, Toolbar, Button, Box, IconButton, Menu as MuiMenu, MenuItem } from '@mui/material';
import { Menu, Search as SearchIcon } from '@mui/icons-material';

export default function Header() {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const navItems = [
    { label: 'ホーム', href: '/' },
    { label: '検索', href: '/search' },
    { label: '保護センター', href: '/shelters' },
  ];

  return (
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
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', marginRight: 'auto' }}>
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
          {navItems.map((item) => (
            <Button
              key={item.href}
              component={Link}
              href={item.href}
              sx={{
                color: '#262626',
                fontSize: '0.875rem',
                fontWeight: 500,
                px: 1.5,
                minWidth: 0,
                transition: 'background-color 0.15s ease',
                '&:hover': { backgroundColor: '#F5F5F5' },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Search icon (always visible, at far right on desktop; near hamburger on mobile) */}
        <IconButton
          component={Link}
          href="/search"
          aria-label="検索"
          sx={{
            color: '#262626',
            width: 44,
            height: 44,
            ml: { xs: 'auto', md: 1 },
            transition: 'background-color 0.15s ease',
            '&:hover': { backgroundColor: '#F5F5F5' },
          }}
        >
          <SearchIcon sx={{ fontSize: 22 }} />
        </IconButton>

        {/* Mobile hamburger */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            onClick={handleMobileMenuOpen}
            aria-label="メニュー"
            sx={{
              color: '#262626',
              width: 44,
              height: 44,
              transition: 'background-color 0.15s ease',
              '&:hover': { backgroundColor: '#F5F5F5' },
            }}
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
          {navItems.map((item) => (
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
  );
}
