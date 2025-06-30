'use client'

import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import ThemeRegistry from '@/components/ThemeRegistry'
import SpaceCatGame from '@/components/SpaceCatGame'
import { AppBar, Toolbar, Typography, Button, Container, Box, IconButton, Menu as MuiMenu, MenuItem } from '@mui/material'
import { Home, Pets, Build, Business, Menu } from '@mui/icons-material'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null)
  
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget)
  }
  
  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null)
  }
  return (
    <html lang="ja">
      <body>
        <ThemeRegistry>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* ヘッダー */}
            <AppBar position="sticky" elevation={2} sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
              <Toolbar>
                <Link href="/" style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" component="h1" sx={{ 
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1.2
                      }}>
                        🐾 Tail Match
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        display: 'block',
                        lineHeight: 1,
                        textAlign: 'center'
                      }}>
                        全国の保護猫マッチングサービス
                      </Typography>
                    </Box>
                  </Box>
                </Link>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
                    <Button 
                      component={Link}
                      href="/"
                      startIcon={<Home />}
                      color="primary"
                    >
                      ホーム
                    </Button>
                    <Button 
                      component={Link}
                      href="/shelters"
                      startIcon={<Business />}
                      color="primary"
                    >
                      保護センターの一覧
                    </Button>
                    <Button 
                      component={Link}
                      href="/api-test"
                      startIcon={<Build />}
                      size="small"
                      color="inherit"
                    >
                      API動作確認
                    </Button>
                  </Box>
                  
                  {/* 宇宙猫ゲーム - 常に表示 */}
                  <SpaceCatGame size="small" />
                  
                  {/* モバイルメニューボタン */}
                  <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                    <IconButton
                      onClick={handleMobileMenuOpen}
                      color="primary"
                      aria-label="メニュー"
                    >
                      <Menu />
                    </IconButton>
                  </Box>
                </Box>
                
                {/* モバイルメニュードロップダウン */}
                <MuiMenu
                  anchorEl={mobileMenuAnchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={handleMobileMenuClose}
                  sx={{ display: { xs: 'block', md: 'none' } }}
                >
                  <MenuItem onClick={handleMobileMenuClose} component={Link} href="/">
                    <Home sx={{ mr: 1 }} />
                    ホーム
                  </MenuItem>
                  <MenuItem onClick={handleMobileMenuClose} component={Link} href="/shelters">
                    <Business sx={{ mr: 1 }} />
                    保護センターの一覧
                  </MenuItem>
                  <MenuItem onClick={handleMobileMenuClose} component={Link} href="/api-test">
                    <Build sx={{ mr: 1 }} />
                    API動作確認
                  </MenuItem>
                </MuiMenu>
              </Toolbar>
            </AppBar>
            
            {/* メインコンテンツ */}
            <Box component="main" sx={{ flexGrow: 1 }}>
              {children}
            </Box>
            
            {/* フッター */}
            <Box component="footer" sx={{ 
              backgroundColor: 'background.paper', 
              borderTop: 1, 
              borderColor: 'divider',
              mt: 8,
              py: 6
            }}>
              <Container maxWidth="lg">
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 4,
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ 
                    flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' },
                    minWidth: 0
                  }}>
                    <Typography variant="h5" component="h3" gutterBottom sx={{
                      background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 'bold'
                    }}>
                      🐾 Tail Match
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      1匹でも多くの猫を救うために。<br />
                      全国の保護猫情報をお届けします。
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' },
                    minWidth: 0
                  }}>
                    <Typography variant="h6" gutterBottom>
                      📋 サイトマップ
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button component={Link} href="/" size="small" sx={{ justifyContent: 'flex-start' }}>
                        🏠 ホーム
                      </Button>
                      <Button component={Link} href="/facilities" size="small" sx={{ justifyContent: 'flex-start' }}>
                        🏥 保護センターの一覧
                      </Button>
                      <Button component={Link} href="/api-test" size="small" sx={{ justifyContent: 'flex-start' }}>
                        🔧 API動作確認
                      </Button>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' },
                    minWidth: 0
                  }}>
                    <Typography variant="h6" gutterBottom>
                      📞 お問い合わせ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                      このサイトは情報提供のみを行っています。<br />
                      猫の譲渡については各自治体に直接お問い合わせください。
                    </Typography>
                    <Button
                      variant="contained"
                      href="https://llll-ll.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                        color: 'white'
                      }}
                    >
                      🌐 llll-ll.com
                    </Button>
                  </Box>
                </Box>
                
                <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 4, pt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                    <Link href="/legal/privacy" color="text.secondary" underline="hover">
                      プライバシーポリシー
                    </Link>
                    <Link href="/legal/terms" color="text.secondary" underline="hover">
                      利用規約
                    </Link>
                    <Link href="/legal/disclaimer" color="text.secondary" underline="hover">
                      免責事項
                    </Link>
                  </Box>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    © 2025 Tail Match by kako-jun | 
                    <Box component="span" sx={{ ml: 1, fontWeight: 'medium' }}>
                      すべての猫に愛ある家族を
                    </Box>
                  </Typography>
                </Box>
              </Container>
            </Box>
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  )
}