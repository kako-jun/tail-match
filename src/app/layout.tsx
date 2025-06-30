import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import ThemeRegistry from '@/components/ThemeRegistry'
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material'
import { Home, Pets, Build } from '@mui/icons-material'

export const metadata: Metadata = {
  title: 'TailMatch - 全国の保護猫マッチングサービス',
  description: '日本全国の自治体保護猫情報を集約し、殺処分を防ぐためのマッチングサービス',
  keywords: ['保護猫', '里親', 'マッチング', '自治体', '猫', '救助'],
  authors: [{ name: 'kako-jun' }],
  openGraph: {
    title: 'TailMatch - 全国の保護猫マッチングサービス',
    description: '1匹でも多くの猫を救うために。全国の保護猫情報をまとめてお届けします。',
    url: 'https://tail-match.llll-ll.com',
    siteName: 'TailMatch',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ 
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1.2
                      }}>
                        🐾 TailMatch
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        display: 'block',
                        lineHeight: 1
                      }}>
                        全国の保護猫マッチングサービス
                      </Typography>
                    </Box>
                  </Box>
                </Link>
                
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
                    href="/tails"
                    startIcon={<Pets />}
                    color="primary"
                  >
                    尻尾ちゃん一覧
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
                
                {/* モバイルメニュー */}
                <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                  <Button 
                    component={Link}
                    href="/tails"
                    startIcon={<Pets />}
                    color="primary"
                    size="small"
                  >
                    一覧
                  </Button>
                </Box>
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
                      🐾 TailMatch
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
                      <Button component={Link} href="/tails" size="small" sx={{ justifyContent: 'flex-start' }}>
                        😺 尻尾ちゃん一覧
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
                
                <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 4, pt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    © 2024 TailMatch by kako-jun | 
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