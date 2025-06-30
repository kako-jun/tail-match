'use client'

import { useState } from 'react'
import TailGrid from '@/components/TailGrid'
import SearchForm from '@/components/SearchForm'
import { Search } from '@mui/icons-material'
import { TailSearchParams } from '@/types/database'
import {
  Container,
  Box,
  Typography,
  Paper
} from '@mui/material'

export default function TailsPage() {
  const [searchParams, setSearchParams] = useState<TailSearchParams>({
    sort_by: 'deadline_date',
    sort_order: 'asc',
    limit: 20
  })

  const handleSearch = (newParams: TailSearchParams) => {
    setSearchParams({
      ...newParams,
      sort_by: 'deadline_date',
      sort_order: 'asc',
      limit: 20
    })
  }

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      {/* ページヘッダー */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" sx={{ 
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          🐾 シッポたち一覧
        </Typography>
        <Typography variant="h6" color="text.secondary">
          家族を待っているシッポたちです
        </Typography>
      </Box>

      {/* 検索・フィルタセクション */}
      <Box component="section" sx={{ mb: 6 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Search sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              検索・フィルタ
            </Typography>
          </Box>
          <SearchForm onSearch={handleSearch} initialParams={searchParams} />
        </Paper>
      </Box>

      {/* シッポたち一覧 */}
      <Box component="section">
        <TailGrid searchParams={searchParams} />
      </Box>
    </Container>
  )
}