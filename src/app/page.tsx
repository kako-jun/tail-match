'use client'

import { useState, useEffect } from 'react'
import { Search, Clock } from 'lucide-react'
import TailGrid from '@/components/TailGrid'
import StatsDisplay from '@/components/StatsDisplay'
import {
  Container,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  IconButton
} from '@mui/material'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // 明るい猫の写真データ
  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&h=400&fit=crop&auto=format',
      title: '幸せな家族を待つシッポたち',
      subtitle: '温かい家庭で愛情をもらえる日を夢見ています'
    },
    {
      url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1200&h=400&fit=crop&auto=format',
      title: '愛らしい表情のシッポたち',
      subtitle: 'あなたとの出会いを心待ちにしています'
    },
    {
      url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1200&h=400&fit=crop&auto=format',
      title: '元気いっぱいのシッポたち',
      subtitle: '新しい家族との楽しい毎日を夢見ています'
    }
  ]

  // 自動スライド
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [heroImages.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  return (
    <>
      {/* ヒーローカルーセル - フルワイド */}
      <Box sx={{ 
        position: 'relative',
        width: '100vw',
        height: { xs: '300px', md: '400px' },
        marginLeft: { xs: '-16px', sm: '-24px', md: '-32px' },
        marginRight: { xs: '-16px', sm: '-24px', md: '-32px' },
        overflow: 'hidden'
      }}>
        {heroImages.map((image, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${image.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 1s ease-in-out',
              opacity: index === currentSlide ? 1 : 0
            }}
          >
            <Box sx={{ 
              textAlign: 'center', 
              color: 'white',
              px: 2,
              py: 4,
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 3,
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="h3" component="h2" sx={{ 
                fontWeight: 'bold',
                mb: 2,
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
              }}>
                {image.title}
              </Typography>
              <Typography variant="h6" sx={{ 
                fontSize: { xs: '1rem', md: '1.2rem' },
                textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                maxWidth: '600px'
              }}>
                {image.subtitle}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* ナビゲーションボタン */}
        <IconButton
          onClick={prevSlide}
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(255,255,255,0.8)',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.9)'
            }
          }}
        >
          <ChevronLeft fontSize="large" />
        </IconButton>

        <IconButton
          onClick={nextSlide}
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(255,255,255,0.8)',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.9)'
            }
          }}
        >
          <ChevronRight fontSize="large" />
        </IconButton>

        {/* インジケーター */}
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 1
        }}>
          {heroImages.map((_, index) => (
            <Box
              key={index}
              onClick={() => setCurrentSlide(index)}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: index === currentSlide ? 'white' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
        {/* メインコンテンツ */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" sx={{
            fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' },
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 3
          }}>
            1匹でも多くの動物を救うために
          </Typography>
          <Typography variant="h5" sx={{
            fontSize: { xs: '1.2rem', md: '1.5rem' },
            color: 'text.primary',
            mb: 4,
            maxWidth: '600px',
            mx: 'auto',
            lineHeight: 1.5
          }}>
            <Box component="span" sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              全国の保護動物情報
            </Box>
            をまとめてお届けします
          </Typography>
        </Box>

        {/* はじめにお読みください */}
        <Paper elevation={3} sx={{
          maxWidth: '900px',
          mx: 'auto',
          p: { xs: 3, md: 4 },
          mb: 6,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #FFF8DC 0%, #FFEFD5 100%)',
          border: '2px solid',
          borderColor: 'primary.main'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{
              background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
              p: 1.5,
              borderRadius: 2,
              mr: 2
            }}>
              <Typography sx={{ color: 'white', fontSize: '1.5rem' }}>📖</Typography>
            </Box>
            <Typography variant="h4" sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              はじめにお読みください
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                「ているまっち！」
              </Box>
              は、全国の自治体が保護している犬・猫の情報を集約し、新しい家族とのマッチングをサポートするサービスです。
            </Typography>

            <Box sx={{ pl: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                <strong>ご注意：</strong>このサイトは情報提供のみを行っています。<br />
                譲渡のお申し込みや詳細なお問い合わせは、各保護センターへ直接ご連絡ください。
              </Typography>
            </Box>

            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              保護動物たちは、期限が過ぎると<Box component="span" sx={{ fontWeight: 'bold', color: 'error.main' }}>殺処分</Box>の可能性があります。
              一匹でも多くの命を救うため、ぜひ里親をご検討ください。
            </Typography>
          </Box>
        </Paper>
            
        {/* 緊急度の高い猫の表示エリア */}
        <Paper 
          elevation={3}
          sx={{
            background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A52 100%)',
            color: 'white',
            p: 4,
            mb: 6,
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <Clock size={28} style={{ marginRight: 12 }} />
              <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
                緊急！残り時間わずか
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ 
              opacity: 0.95,
              mb: 4,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.6
            }}>
              以下のシッポたちは、残り時間がわずかです。<br />
              <Box component="span" sx={{ fontWeight: 'bold' }}>
                今すぐ行動を起こしてください。
              </Box>
            </Typography>
            <Box sx={{ mt: 4 }}>
              <TailGrid showUrgentOnly={true} maxCount={6} />
            </Box>
          </Box>
        </Paper>

        {/* 検索セクション */}
        <Box component="section" sx={{ py: { xs: 8, lg: 12 } }}>
          <Paper 
            elevation={4}
            sx={{
              maxWidth: '1000px',
              mx: 'auto',
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: 'rgba(255, 248, 220, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
              <Box sx={{
                background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                p: 2,
                borderRadius: 3,
                mr: 2
              }}>
                <Search color="white" size={28} />
              </Box>
              <Typography variant="h3" sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                シッポたちを探す
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth size="large">
                <InputLabel sx={{ fontSize: '1.1rem', fontWeight: 'semibold' }}>
                  🌍 お住まいの地域
                </InputLabel>
                <Select
                  label="🌍 お住まいの地域"
                  defaultValue=""
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 3,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: 2,
                      borderColor: 'rgba(255, 255, 255, 0.4)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main'
                    },
                    minHeight: '64px'
                  }}
                >
                  <MenuItem value="">地域を選択してください</MenuItem>
                  <MenuItem value="hokkaido">🗾 北海道</MenuItem>
                  <MenuItem value="tohoku">🏔️ 東北</MenuItem>
                  <MenuItem value="kanto">🏙️ 関東</MenuItem>
                  <MenuItem value="chubu">🗻 中部</MenuItem>
                  <MenuItem value="kansai">🏯 関西</MenuItem>
                  <MenuItem value="chugoku">⛩️ 中国</MenuItem>
                  <MenuItem value="shikoku">🌊 四国</MenuItem>
                  <MenuItem value="kyushu">🌺 九州・沖縄</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' }, minWidth: 0 }}>
                  <FormControl fullWidth size="large">
                    <InputLabel sx={{ fontSize: '1rem', fontWeight: 'semibold' }}>
                      ⚧ 性別
                    </InputLabel>
                    <Select
                      label="⚧ 性別"
                      defaultValue=""
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 3,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderWidth: 2,
                          borderColor: 'rgba(255, 255, 255, 0.4)'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        minHeight: '56px'
                      }}
                    >
                      <MenuItem value="">指定なし</MenuItem>
                      <MenuItem value="male">♂ オス</MenuItem>
                      <MenuItem value="female">♀ メス</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' }, minWidth: 0 }}>
                  <FormControl fullWidth size="large">
                    <InputLabel sx={{ fontSize: '1rem', fontWeight: 'semibold' }}>
                      🎂 年齢
                    </InputLabel>
                    <Select
                      label="🎂 年齢"
                      defaultValue=""
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 3,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderWidth: 2,
                          borderColor: 'rgba(255, 255, 255, 0.4)'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        minHeight: '56px'
                      }}
                    >
                      <MenuItem value="">指定なし</MenuItem>
                      <MenuItem value="kitten">🐱 子猫（1歳未満）</MenuItem>
                      <MenuItem value="adult">🐈 成猫（1-7歳）</MenuItem>
                      <MenuItem value="senior">👴 シニア猫（7歳以上）</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' }, minWidth: 0 }}>
                  <FormControl fullWidth size="large">
                    <InputLabel sx={{ fontSize: '1rem', fontWeight: 'semibold' }}>
                      🎨 猫種
                    </InputLabel>
                    <Select
                      label="🎨 猫種"
                      defaultValue=""
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 3,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderWidth: 2,
                          borderColor: 'rgba(255, 255, 255, 0.4)'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        minHeight: '56px'
                      }}
                    >
                      <MenuItem value="">指定なし</MenuItem>
                      <MenuItem value="mixed">🎭 ミックス</MenuItem>
                      <MenuItem value="persian">👑 ペルシャ</MenuItem>
                      <MenuItem value="siamese">🎌 シャム</MenuItem>
                      <MenuItem value="maine-coon">🦁 メインクーン</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              <Box sx={{ pt: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Search size={24} />}
                  sx={{
                    py: 2,
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    borderRadius: 3,
                    textTransform: 'none'
                  }}
                >
                  🔍 シッポたちを探す
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* 統計情報 */}
        <Box component="section" sx={{ 
          py: { xs: 8, md: 12 },
          background: 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)'
        }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}>
              📊 リアルタイム統計
            </Typography>
            <Typography variant="h5" color="text.secondary">
              現在の保護動物情報をお知らせします
            </Typography>
          </Box>
          <StatsDisplay />
        </Box>

        {/* お知らせ */}
        <Box component="section" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ 
            maxWidth: '900px',
            mx: 'auto',
            p: 4,
            borderRadius: 4,
            background: 'rgba(255, 248, 220, 0.8)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Box sx={{
                background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                p: 2,
                borderRadius: 3,
                mr: 2
              }}>
                <Typography sx={{ color: 'white', fontSize: '1.5rem' }}>📢</Typography>
              </Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                最新のお知らせ
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper elevation={2} sx={{
                background: 'linear-gradient(135deg, #E8F5E8 0%, #E6F3FF 100%)',
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(76, 175, 80, 0.2)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{
                    backgroundColor: '#C8E6C9',
                    color: '#2E7D32',
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    mr: 2,
                    mt: 0.5,
                    minWidth: 'fit-content'
                  }}>
                    2024.06.30
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                      🎉 Phase 3 UI/UX完成！
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      検索・フィルタリング機能、緊急度表示システム、統計ダッシュボードが完成しました！
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper elevation={2} sx={{
                background: 'linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%)',
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(63, 81, 181, 0.2)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{
                    backgroundColor: '#BBDEFB',
                    color: '#1565C0',
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    mr: 2,
                    mt: 0.5,
                    minWidth: 'fit-content'
                  }}>
                    準備中
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                      🔄 自治体連携拡大中
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      全国の自治体との連携を順次開始いたします。石川県に続き、他の都道府県も追加予定です。
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Paper>
        </Box>
      </Container>
    </>
  )
}