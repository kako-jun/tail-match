'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Dialog,
  DialogContent,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress
} from '@mui/material'
import { Favorite, Share, Close, LocationOn, AccessTime, Pets } from '@mui/icons-material'
import Link from 'next/link'
import type { TailWithDetails } from '@/types/database'

export default function GalleryPage() {
  const [animals, setAnimals] = useState<TailWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnimal, setSelectedAnimal] = useState<TailWithDetails | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [animalType, setAnimalType] = useState<'all' | 'cat' | 'dog'>('all')

  // データ取得
  useEffect(() => {
    const fetchAnimals = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: '100',
          status: 'available'
        })

        if (animalType !== 'all') {
          params.append('animal_type', animalType)
        }

        const response = await fetch(`/api/tails?${params}`)
        const data = await response.json()

        // 画像がある動物のみをフィルター
        const animalsWithImages = (data.data || []).filter(
          (animal: TailWithDetails) => animal.images && animal.images.length > 0
        )

        setAnimals(animalsWithImages)
      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnimals()
  }, [animalType])

  // 画像クリック時
  const handleImageClick = (animal: TailWithDetails) => {
    setSelectedAnimal(animal)
    setDialogOpen(true)
  }

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setDialogOpen(false)
    setTimeout(() => setSelectedAnimal(null), 200)
  }

  // 緊急度レベル計算
  const getUrgencyLevel = (deadlineDate: string | undefined) => {
    if (!deadlineDate) return null
    const deadline = new Date(deadlineDate)
    const now = new Date()
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 3) return 'urgent'
    if (daysRemaining <= 7) return 'warning'
    if (daysRemaining <= 14) return 'caution'
    return 'normal'
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ページタイトル */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          📷 ギャラリー
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          新しい家族を待っている動物たちの写真集
        </Typography>

        {/* 動物種別フィルター */}
        <ToggleButtonGroup
          value={animalType}
          exclusive
          onChange={(e, value) => value && setAnimalType(value)}
          aria-label="動物種別"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="all" aria-label="すべて">
            🐾 すべて
          </ToggleButton>
          <ToggleButton value="cat" aria-label="猫">
            🐱 猫
          </ToggleButton>
          <ToggleButton value="dog" aria-label="犬">
            🐶 犬
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="body2" color="text.secondary">
          全 {animals.length} 匹
        </Typography>
      </Box>

      {/* ローディング */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : animals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            表示できる画像がありません
          </Typography>
        </Box>
      ) : (
        /* Instagram風グリッド */
        <ImageList
          variant="masonry"
          cols={window.innerWidth < 600 ? 2 : window.innerWidth < 960 ? 3 : 4}
          gap={16}
        >
          {animals.map((animal) => {
            const urgency = getUrgencyLevel(animal.deadline_date)
            const mainImage = Array.isArray(animal.images) ? animal.images[0] : null

            if (!mainImage) return null

            return (
              <ImageListItem
                key={animal.id}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    '& .MuiImageListItemBar-root': {
                      opacity: 1
                    }
                  }
                }}
                onClick={() => handleImageClick(animal)}
              >
                <img
                  src={mainImage}
                  alt={animal.name || '保護動物'}
                  loading="lazy"
                  style={{
                    borderRadius: 8,
                    objectFit: 'cover',
                    width: '100%',
                    height: 'auto'
                  }}
                />
                <ImageListItemBar
                  title={animal.name || '名前未定'}
                  subtitle={
                    <Box component="span">
                      {animal.animal_type === 'cat' ? '🐱' : '🐶'}{' '}
                      {animal.municipality?.name || '保護センター'}
                    </Box>
                  }
                  actionIcon={
                    urgency === 'urgent' ? (
                      <IconButton sx={{ color: 'error.main' }}>
                        <AccessTime />
                      </IconButton>
                    ) : null
                  }
                  sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s ease-in-out',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)'
                  }}
                />
              </ImageListItem>
            )
          })}
        </ImageList>
      )}

      {/* 詳細ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedAnimal && (
          <DialogContent sx={{ p: 0 }}>
            <Card elevation={0}>
              {/* 画像 */}
              {selectedAnimal.images && selectedAnimal.images[0] && (
                <CardMedia
                  component="img"
                  image={selectedAnimal.images[0]}
                  alt={selectedAnimal.name || '保護動物'}
                  sx={{ maxHeight: 500, objectFit: 'contain', backgroundColor: 'black' }}
                />
              )}

              {/* 詳細情報 */}
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {selectedAnimal.name || '名前未定'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<Pets />}
                        label={selectedAnimal.animal_type === 'cat' ? '猫' : '犬'}
                        color="primary"
                        size="small"
                      />
                      {selectedAnimal.gender && (
                        <Chip
                          label={selectedAnimal.gender === 'male' ? 'オス' : 'メス'}
                          size="small"
                        />
                      )}
                      {selectedAnimal.age_estimate && (
                        <Chip label={selectedAnimal.age_estimate} size="small" />
                      )}
                      {selectedAnimal.breed && (
                        <Chip label={selectedAnimal.breed} size="small" />
                      )}
                    </Box>
                  </Box>
                  <IconButton onClick={handleCloseDialog}>
                    <Close />
                  </IconButton>
                </Box>

                {/* 保護センター情報 */}
                {selectedAnimal.municipality && (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {selectedAnimal.municipality.name}
                      </Typography>
                    </Box>
                    {selectedAnimal.region && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedAnimal.region.name}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* 特徴・性格 */}
                {(selectedAnimal.personality || selectedAnimal.color || selectedAnimal.size) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      特徴
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {selectedAnimal.color && (
                        <Typography variant="body1">
                          <strong>毛色:</strong> {selectedAnimal.color}
                        </Typography>
                      )}
                      {selectedAnimal.size && (
                        <Typography variant="body1">
                          <strong>体格:</strong> {selectedAnimal.size}
                        </Typography>
                      )}
                      {selectedAnimal.personality && (
                        <Typography variant="body1">
                          <strong>性格:</strong> {selectedAnimal.personality}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {/* 期限 */}
                {selectedAnimal.deadline_date && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<AccessTime />}
                      label={`期限: ${new Date(selectedAnimal.deadline_date).toLocaleDateString('ja-JP')}`}
                      color={getUrgencyLevel(selectedAnimal.deadline_date) === 'urgent' ? 'error' : 'default'}
                    />
                  </Box>
                )}

                {/* アクションボタン */}
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    component={Link}
                    href={`/tails/${selectedAnimal.id}`}
                    size="large"
                  >
                    詳細を見る
                  </Button>
                  {selectedAnimal.source_url && (
                    <Button
                      variant="outlined"
                      fullWidth
                      href={selectedAnimal.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="large"
                    >
                      施設サイトへ
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </DialogContent>
        )}
      </Dialog>
    </Container>
  )
}
