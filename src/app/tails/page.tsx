'use client'

import { useState } from 'react'
import TailGrid from '@/components/TailGrid'
import SearchForm from '@/components/SearchForm'
import { Search } from 'lucide-react'
import { TailSearchParams } from '@/types/database'

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
    <div className="container py-8">
      {/* ページヘッダー */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-calico-brown mb-4">
          🐾 尻尾ちゃん一覧
        </h1>
        <p className="text-lg text-calico-black">
          家族を待っている尻尾ちゃんたちです
        </p>
      </div>

      {/* 検索・フィルタセクション */}
      <section className="mb-8">
        <div className="card">
          <div className="flex items-center mb-4">
            <Search className="mr-2 text-denim" size={24} />
            <h2 className="text-xl font-bold text-calico-brown">検索・フィルタ</h2>
          </div>
          <SearchForm onSearch={handleSearch} initialParams={searchParams} />
        </div>
      </section>

      {/* 尻尾ちゃん一覧 */}
      <section>
        <TailGrid searchParams={searchParams} />
      </section>
    </div>
  )
}