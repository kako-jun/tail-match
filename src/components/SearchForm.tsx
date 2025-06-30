'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { TailSearchParams } from '@/types/database'

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">お住まいの地域</label>
        <select 
          className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent"
          value={searchParams.region_id || ''}
          onChange={(e) => handleChange('region_id', e.target.value ? parseInt(e.target.value) : undefined)}
        >
          <option value="">地域を選択してください</option>
          <option value="13">東京都</option>
          <option value="14">神奈川県</option>
          <option value="17">石川県</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">性別</label>
          <select 
            className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent"
            value={searchParams.gender || ''}
            onChange={(e) => handleChange('gender', e.target.value)}
          >
            <option value="">指定なし</option>
            <option value="male">オス</option>
            <option value="female">メス</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">年齢</label>
          <select 
            className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent"
            value={searchParams.age_estimate || ''}
            onChange={(e) => handleChange('age_estimate', e.target.value)}
          >
            <option value="">指定なし</option>
            <option value="子猫">子猫（1歳未満）</option>
            <option value="成猫">成猫（1-7歳）</option>
            <option value="シニア猫">シニア猫（7歳以上）</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">緊急度</label>
          <select 
            className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent"
            value={searchParams.urgency_days || ''}
            onChange={(e) => handleChange('urgency_days', e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">指定なし</option>
            <option value="3">3日以内</option>
            <option value="7">1週間以内</option>
            <option value="14">2週間以内</option>
          </select>
        </div>
      </div>
      
      <button type="submit" className="btn-primary w-full py-3 text-lg">
        <Search className="inline mr-2" size={20} />
        尻尾ちゃんを探す
      </button>
    </form>
  )
}