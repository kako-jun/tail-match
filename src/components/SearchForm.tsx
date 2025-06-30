'use client'

import { useState } from 'react'
import { Search } from '@mui/icons-material'
import { TailSearchParams } from '@/types/database'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid
} from '@mui/material'

interface SearchFormProps {
  onSearch: (params: TailSearchParams) => void
  initialParams?: TailSearchParams
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
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormControl fullWidth size="large">
        <InputLabel>🌍 お住まいの地域</InputLabel>
        <Select
          label="🌍 お住まいの地域"
          value={searchParams.region_id || ''}
          onChange={(e) => handleChange('region_id', e.target.value ? parseInt(e.target.value as string) : undefined)}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 2,
            minHeight: '56px'
          }}
        >
          <MenuItem value="">地域を選択してください</MenuItem>
          <MenuItem value="13">🗾 東京都</MenuItem>
          <MenuItem value="14">🏙️ 神奈川県</MenuItem>
          <MenuItem value="17">🌊 石川県</MenuItem>
        </Select>
      </FormControl>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="large">
            <InputLabel>⚧ 性別</InputLabel>
            <Select
              label="⚧ 性別"
              value={searchParams.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value as string)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 2,
                minHeight: '56px'
              }}
            >
              <MenuItem value="">指定なし</MenuItem>
              <MenuItem value="male">♂ オス</MenuItem>
              <MenuItem value="female">♀ メス</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="large">
            <InputLabel>🎂 年齢</InputLabel>
            <Select
              label="🎂 年齢"
              value={searchParams.age_estimate || ''}
              onChange={(e) => handleChange('age_estimate', e.target.value as string)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 2,
                minHeight: '56px'
              }}
            >
              <MenuItem value="">指定なし</MenuItem>
              <MenuItem value="子猫">🐱 子猫（1歳未満）</MenuItem>
              <MenuItem value="成猫">🐈 成猫（1-7歳）</MenuItem>
              <MenuItem value="シニア猫">👴 シニア猫（7歳以上）</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="large">
            <InputLabel>⚠️ 緊急度</InputLabel>
            <Select
              label="⚠️ 緊急度"
              value={searchParams.urgency_days || ''}
              onChange={(e) => handleChange('urgency_days', e.target.value ? parseInt(e.target.value as string) : undefined)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 2,
                minHeight: '56px'
              }}
            >
              <MenuItem value="">指定なし</MenuItem>
              <MenuItem value="3">🚨 3日以内</MenuItem>
              <MenuItem value="7">⚠️ 1週間以内</MenuItem>
              <MenuItem value="14">📅 2週間以内</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      <Button
        type="submit"
        variant="contained"
        size="large"
        startIcon={<Search />}
        sx={{
          py: 2,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          borderRadius: 2,
          textTransform: 'none'
        }}
      >
        🔍 シッポたちを探す
      </Button>
    </Box>
  )
}