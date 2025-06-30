'use client'

import { useState, useEffect } from 'react'
import TailCard from './TailCard'
import { TailWithDetails, TailSearchParams } from '@/types/database'
import { Loader2, AlertCircle } from 'lucide-react'

interface TailGridProps {
  searchParams?: TailSearchParams
  showUrgentOnly?: boolean
  maxCount?: number
}

interface ApiResponse {
  success: boolean
  data: TailWithDetails[]
  total?: number
  has_more?: boolean
  error?: string
  message?: string
}

export default function TailGrid({ 
  searchParams = {}, 
  showUrgentOnly = false,
  maxCount 
}: TailGridProps) {
  const [tails, setTails] = useState<TailWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTails = async () => {
      setLoading(true)
      setError(null)

      try {
        let url: string
        let params: URLSearchParams

        if (showUrgentOnly) {
          url = '/api/tails/urgent'
          params = new URLSearchParams()
          if (maxCount) params.set('limit', maxCount.toString())
        } else {
          url = '/api/tails'
          params = new URLSearchParams()
          
          // 検索パラメータを構築
          Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.set(key, value.toString())
            }
          })
          
          if (maxCount) params.set('limit', maxCount.toString())
        }

        const response = await fetch(`${url}?${params.toString()}`)
        const data: ApiResponse = await response.json()

        if (!response.ok) {
          throw new Error(data.message || data.error || 'APIエラーが発生しました')
        }

        if (data.success) {
          setTails(data.data || [])
        } else {
          throw new Error(data.error || '予期しないエラーが発生しました')
        }

      } catch (err) {
        console.error('Failed to fetch tails:', err)
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchTails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(searchParams), showUrgentOnly, maxCount])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-denim mx-auto mb-4" />
          <p className="text-calico-black">尻尾ちゃんを探しています...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-urgent-red mx-auto mb-4" />
          <p className="text-urgent-red mb-2">エラーが発生しました</p>
          <p className="text-sm text-calico-black">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary mt-4"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  if (tails.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😿</div>
        <h3 className="text-xl font-bold text-calico-brown mb-2">
          {showUrgentOnly ? '緊急の尻尾ちゃんは見つかりませんでした' : '条件に合う尻尾ちゃんが見つかりませんでした'}
        </h3>
        <p className="text-calico-black">
          {showUrgentOnly ? 
            '現在、緊急度の高い保護猫はいません。' : 
            '検索条件を変更して再度お試しください。'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー情報 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-calico-black">
          {showUrgentOnly ? 
            `緊急度の高い尻尾ちゃん ${tails.length}匹` :
            `${tails.length}匹の尻尾ちゃんが見つかりました`
          }
        </p>
      </div>

      {/* グリッド表示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tails.map((tail) => (
          <TailCard 
            key={tail.id} 
            tail={tail}
            showRegion={true}
          />
        ))}
      </div>

      {/* 緊急度の高い猫がいる場合の注意書き */}
      {showUrgentOnly && tails.length > 0 && (
        <div className="bg-urgent-red text-white p-4 rounded-lg text-center">
          <p className="font-bold mb-2">⚠️ 緊急を要する尻尾ちゃんたちです</p>
          <p className="text-sm">
            これらの猫たちは残り時間がわずかです。
            お近くの方、または遠方でも引き取り可能な方は、
            各自治体に直接お問い合わせください。
          </p>
        </div>
      )}
    </div>
  )
}