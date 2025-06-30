'use client'

import { useState, useEffect } from 'react'
import { Heart, MapPin, Clock, TrendingUp } from 'lucide-react'

interface Stats {
  total: number
  urgent: number
  warning: number
  caution: number
  by_region: { region_name: string; count: string }[]
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
          setStats(data.data)
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 現在掲載中 */}
        <div className="stat-card text-center group">
          <div className="bg-gradient-to-br from-pink-100 to-pink-200 p-4 rounded-2xl inline-block mb-4 group-hover:scale-110 transition-transform duration-300">
            <Heart className="text-pink-600" size={36} />
          </div>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-pink-700 bg-clip-text text-transparent mb-2">
            {stats.total.toLocaleString()}
          </h3>
          <p className="text-gray-600 font-medium">現在掲載中の尻尾ちゃん</p>
        </div>
        
        {/* 緊急度の高い猫 */}
        <div className="stat-card text-center group">
          <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-2xl inline-block mb-4 group-hover:scale-110 transition-transform duration-300">
            <Clock className="text-red-600 animate-pulse" size={36} />
          </div>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-2">
            {stats.urgent.toLocaleString()}
          </h3>
          <p className="text-gray-600 font-medium">緊急度の高い尻尾ちゃん</p>
          <p className="text-xs text-red-500 font-semibold mt-2 bg-red-50 px-2 py-1 rounded-full inline-block">
            残り3日以内
          </p>
        </div>
        
        {/* 連携地域数 */}
        <div className="stat-card text-center group">
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-2xl inline-block mb-4 group-hover:scale-110 transition-transform duration-300">
            <MapPin className="text-blue-600" size={36} />
          </div>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">
            {stats.by_region.length.toLocaleString()}
          </h3>
          <p className="text-gray-600 font-medium">連携地域数</p>
        </div>
        
        {/* 注意猫 */}
        <div className="stat-card text-center group">
          <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-2xl inline-block mb-4 group-hover:scale-110 transition-transform duration-300">
            <div className="text-orange-600 text-3xl">⚠️</div>
          </div>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent mb-2">
            {stats.warning.toLocaleString()}
          </h3>
          <p className="text-gray-600 font-medium">要注意な尻尾ちゃん</p>
          <p className="text-xs text-orange-500 font-semibold mt-2 bg-orange-50 px-2 py-1 rounded-full inline-block">
            残り1週間以内
          </p>
        </div>
      </div>

      {/* 注意が必要な猫がいる場合の追加表示 */}
      {(stats.urgent > 0 || stats.warning > 0) && (
        <div className="urgent-alert p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-600/20 animate-pulse"></div>
          <div className="relative z-10">
            <Clock className="inline w-6 h-6 mr-3 animate-pulse" />
            <span className="font-bold text-lg">
              注意が必要な尻尾ちゃんが {stats.urgent + stats.warning} 匹います
            </span>
            <div className="flex justify-center items-center mt-4 space-x-6">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-sm font-semibold">緊急: {stats.urgent}匹</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-sm font-semibold">要注意: {stats.warning}匹</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-sm font-semibold">注意: {stats.caution}匹</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 地域別統計 */}
      {stats.by_region.length > 0 && (
        <div className="card-glass">
          <div className="text-center mb-6">
            <h4 className="text-2xl font-bold bg-gradient-to-r from-calico-brown to-denim bg-clip-text text-transparent mb-2">
              🗾 地域別 尻尾ちゃん分布
            </h4>
            <p className="text-gray-600">現在連携している地域の保護猫情報</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.by_region.map((region, index) => (
              <div key={index} className="region-tag text-center group cursor-pointer">
                <p className="font-semibold text-blue-800 mb-1">{region.region_name}</p>
                <p className="text-2xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-200">
                  {region.count}匹
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}