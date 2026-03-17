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
      {/* Page header */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: '1px solid #DBDBDB' }}>
        <Typography sx={{ fontSize: '1.375rem', fontWeight: 300, color: '#262626', letterSpacing: '-0.01em' }}>
          シッポたち一覧
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#8E8E8E', mt: 0.5 }}>
          家族を待っているシッポたちです
        </Typography>
      </Box>

      {/* Search/filter */}
      <Box component="section" sx={{ mb: 4 }}>
        <Box
          sx={{
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            p: { xs: 2.5, md: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1 }}>
            <Search sx={{ fontSize: 16, color: '#8E8E8E' }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
              絞り込み
            </Typography>
          </Box>
          <SearchForm onSearch={handleSearch} initialParams={searchParams} />
        </Box>
      </Box>

      {/* シッポたち一覧 */}
      <Box component="section">
        <TailGrid searchParams={searchParams} />
      </Box>
    </Container>
  )
}