'use client'

import { useState } from 'react'
import { Search } from '@mui/icons-material'
import { TailSearchParams } from '@/types/database'
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  Grid,
  Typography,
} from '@mui/material'

interface SearchFormProps {
  onSearch: (params: TailSearchParams) => void
  initialParams?: TailSearchParams
}

const selectSx = {
  backgroundColor: '#FAFAFA',
  borderRadius: '8px',
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#DBDBDB',
    borderWidth: 1,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#A8A8A8',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#262626',
    borderWidth: 1,
  },
  '& .MuiSelect-select': {
    padding: '10px 14px',
    color: '#262626',
  },
}

export default function SearchForm({ onSearch, initialParams = {} }: SearchFormProps) {
  const [searchParams, setSearchParams] = useState<TailSearchParams>(initialParams)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchParams)
  }

  const handleChange = (field: keyof TailSearchParams, value: string | number | undefined) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }))
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Region */}
      <Box>
        <Typography
          component="label"
          sx={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#8E8E8E',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.75,
          }}
        >
          地域
        </Typography>
        <FormControl fullWidth>
          <Select
            displayEmpty
            value={searchParams.region_id || ''}
            onChange={(e) => handleChange('region_id', e.target.value ? parseInt(e.target.value as string) : undefined)}
            sx={selectSx}
          >
            <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>すべての地域</MenuItem>
            <MenuItem value="10" sx={{ fontSize: '0.875rem' }}>東京都</MenuItem>
            <MenuItem value="11" sx={{ fontSize: '0.875rem' }}>神奈川県</MenuItem>
            <MenuItem value="1" sx={{ fontSize: '0.875rem' }}>石川県</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography
            component="label"
            sx={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#8E8E8E',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 0.75,
            }}
          >
            性別
          </Typography>
          <FormControl fullWidth>
            <Select
              displayEmpty
              value={searchParams.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value as string)}
              sx={selectSx}
            >
              <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>指定なし</MenuItem>
              <MenuItem value="male" sx={{ fontSize: '0.875rem' }}>オス</MenuItem>
              <MenuItem value="female" sx={{ fontSize: '0.875rem' }}>メス</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography
            component="label"
            sx={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#8E8E8E',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 0.75,
            }}
          >
            年齢
          </Typography>
          <FormControl fullWidth>
            <Select
              displayEmpty
              value={searchParams.age_estimate || ''}
              onChange={(e) => handleChange('age_estimate', e.target.value as string)}
              sx={selectSx}
            >
              <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>指定なし</MenuItem>
              <MenuItem value="子猫" sx={{ fontSize: '0.875rem' }}>子猫（1歳未満）</MenuItem>
              <MenuItem value="成猫" sx={{ fontSize: '0.875rem' }}>成猫（1〜7歳）</MenuItem>
              <MenuItem value="シニア猫" sx={{ fontSize: '0.875rem' }}>シニア猫（7歳以上）</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography
            component="label"
            sx={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#8E8E8E',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 0.75,
            }}
          >
            緊急度
          </Typography>
          <FormControl fullWidth>
            <Select
              displayEmpty
              value={searchParams.urgency_days || ''}
              onChange={(e) => handleChange('urgency_days', e.target.value ? parseInt(e.target.value as string) : undefined)}
              sx={selectSx}
            >
              <MenuItem value="" sx={{ color: '#8E8E8E', fontSize: '0.875rem' }}>指定なし</MenuItem>
              <MenuItem value="3" sx={{ fontSize: '0.875rem' }}>3日以内</MenuItem>
              <MenuItem value="7" sx={{ fontSize: '0.875rem' }}>1週間以内</MenuItem>
              <MenuItem value="14" sx={{ fontSize: '0.875rem' }}>2週間以内</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Button
        type="submit"
        variant="contained"
        size="medium"
        startIcon={<Search sx={{ fontSize: 18 }} />}
        sx={{
          mt: 0.5,
          py: 1.25,
          fontSize: '0.875rem',
          fontWeight: 600,
          borderRadius: '8px',
          backgroundColor: '#262626',
          '&:hover': { backgroundColor: '#000000' },
        }}
      >
        シッポたちを探す
      </Button>
    </Box>
  )
}
