'use client'

import { useState, useEffect } from 'react'
import { Heart, MapPin, Clock, TrendingUp } from 'lucide-react'

interface Stats {
  available_count: number
  adopted_count: number
  municipality_count: number
  urgent_count: number
  warning_count: number
}

export default function StatsDisplay() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/tails?stats=true')
        const data = await response.json()
        
        if (data.success && data.data) {
          setStats({
            available_count: parseInt(data.data.available_count) || 0,
            adopted_count: parseInt(data.data.adopted_count) || 0,
            municipality_count: parseInt(data.data.municipality_count) || 0,
            urgent_count: parseInt(data.data.urgent_count) || 0,
            warning_count: parseInt(data.data.warning_count) || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card text-center animate-pulse">
            <div className="w-8 h-8 bg-calico-cream rounded mx-auto mb-3"></div>
            <div className="w-16 h-8 bg-calico-cream rounded mx-auto mb-2"></div>
            <div className="w-24 h-4 bg-calico-cream rounded mx-auto"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card text-center">
          <Heart className="mx-auto mb-3 text-calico-pink" size={32} />
          <h3 className="text-2xl font-bold text-calico-brown mb-2">-</h3>
          <p className="text-calico-black">現在掲載中の尻尾ちゃん</p>
        </div>
        
        <div className="card text-center">
          <MapPin className="mx-auto mb-3 text-denim" size={32} />
          <h3 className="text-2xl font-bold text-calico-brown mb-2">-</h3>
          <p className="text-calico-black">連携自治体数</p>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold text-calico-brown mb-2">-</h3>
          <p className="text-calico-black">ハッピーマッチング</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {/* 現在掲載中 */}
      <div className="card text-center">
        <Heart className="mx-auto mb-3 text-calico-pink" size={32} />
        <h3 className="text-2xl font-bold text-calico-brown mb-2">
          {stats.available_count.toLocaleString()}
        </h3>
        <p className="text-calico-black">現在掲載中の尻尾ちゃん</p>
      </div>
      
      {/* 緊急度の高い猫 */}
      <div className="card text-center">
        <Clock className="mx-auto mb-3 text-urgent-red" size={32} />
        <h3 className="text-2xl font-bold text-urgent-red mb-2">
          {stats.urgent_count.toLocaleString()}
        </h3>
        <p className="text-calico-black">緊急度の高い尻尾ちゃん</p>
        <p className="text-xs text-urgent-red mt-1">残り3日以内</p>
      </div>
      
      {/* 連携自治体数 */}
      <div className="card text-center">
        <MapPin className="mx-auto mb-3 text-denim" size={32} />
        <h3 className="text-2xl font-bold text-calico-brown mb-2">
          {stats.municipality_count.toLocaleString()}
        </h3>
        <p className="text-calico-black">連携自治体数</p>
      </div>
      
      {/* ハッピーマッチング */}
      <div className="card text-center">
        <TrendingUp className="mx-auto mb-3 text-green-600" size={32} />
        <h3 className="text-2xl font-bold text-calico-brown mb-2">
          {stats.adopted_count.toLocaleString()}
        </h3>
        <p className="text-calico-black">ハッピーマッチング</p>
      </div>

      {/* 注意が必要な猫がいる場合の追加表示 */}
      {(stats.urgent_count > 0 || stats.warning_count > 0) && (
        <div className="col-span-full">
          <div className="bg-urgent-orange text-white p-4 rounded-lg text-center">
            <Clock className="inline w-5 h-5 mr-2" />
            <span className="font-bold">
              注意が必要な尻尾ちゃんが {stats.urgent_count + stats.warning_count} 匹います
            </span>
            <p className="text-sm mt-1">
              緊急: {stats.urgent_count}匹 | 要注意: {stats.warning_count}匹
            </p>
          </div>
        </div>
      )}
    </div>
  )
}