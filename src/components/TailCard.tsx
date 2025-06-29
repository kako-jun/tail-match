import Link from 'next/link'
import { Clock, MapPin, Heart } from 'lucide-react'
import { TailWithDetails } from '@/types/database'

interface TailCardProps {
  tail: TailWithDetails
  showRegion?: boolean
}

export default function TailCard({ tail, showRegion = true }: TailCardProps) {
  // 緊急度によるスタイル設定
  const getUrgencyStyle = () => {
    switch (tail.urgency_level) {
      case 'urgent':
        return 'emergency-urgent'
      case 'warning':
        return 'emergency-warning'
      case 'caution':
        return 'emergency-caution'
      default:
        return 'bg-white'
    }
  }

  // 残り日数の表示
  const formatDaysRemaining = () => {
    if (!tail.days_remaining) return null
    
    if (tail.days_remaining < 0) {
      return '期限切れ'
    } else if (tail.days_remaining === 0) {
      return '今日まで！'
    } else {
      return `あと${tail.days_remaining}日`
    }
  }

  // 画像URL（エラー時のフォールバック付き）
  const imageUrl = tail.images && tail.images.length > 0 
    ? tail.images[0] 
    : '/images/no-image-cat.svg'

  return (
    <Link href={`/tails/${tail.id}`}>
      <div className={`card hover:shadow-lg transition-shadow cursor-pointer ${getUrgencyStyle()}`}>
        {/* 画像エリア */}
        <div className="relative mb-4">
          <div className="aspect-square bg-calico-cream rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={tail.name || '保護猫'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/images/no-image-cat.svg'
              }}
            />
          </div>
          
          {/* 緊急度バッジ */}
          {tail.urgency_level !== 'normal' && tail.days_remaining !== null && (
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
              tail.urgency_level === 'urgent' ? 'bg-urgent-red text-white animate-pulse-urgent' :
              tail.urgency_level === 'warning' ? 'bg-urgent-orange text-white' :
              'bg-urgent-yellow text-calico-black'
            }`}>
              <Clock className="inline w-3 h-3 mr-1" />
              {formatDaysRemaining()}
            </div>
          )}

          {/* 譲渡決定バッジ */}
          {tail.transfer_decided && (
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              <Heart className="inline w-3 h-3 mr-1" />
              譲渡決定
            </div>
          )}
        </div>

        {/* 情報エリア */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-calico-brown">
            {tail.name || '名前未定'}
          </h3>
          
          <div className="text-sm text-calico-black space-y-1">
            <p>
              <span className="font-medium">品種:</span> {tail.breed || 'ミックス'}
            </p>
            <p>
              <span className="font-medium">年齢:</span> {tail.age_estimate || '不明'}
            </p>
            <p>
              <span className="font-medium">性別:</span> {
                tail.gender === 'male' ? 'オス' :
                tail.gender === 'female' ? 'メス' : '不明'
              }
            </p>
            {tail.color && (
              <p>
                <span className="font-medium">毛色:</span> {tail.color}
              </p>
            )}
          </div>

          {/* 地域情報 */}
          {showRegion && (
            <div className="flex items-center text-sm text-denim">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{tail.region?.name} / {tail.municipality?.name}</span>
            </div>
          )}

          {/* 性格・健康状態（一部表示） */}
          {tail.personality && (
            <p className="text-sm text-calico-black line-clamp-2">
              <span className="font-medium">性格:</span> {tail.personality}
            </p>
          )}

          {/* 期限日表示 */}
          {tail.deadline_date && (
            <div className="text-sm">
              <span className="font-medium">期限:</span> 
              <span className={`ml-1 ${
                tail.urgency_level === 'urgent' ? 'text-urgent-red font-bold' :
                tail.urgency_level === 'warning' ? 'text-urgent-orange font-bold' :
                tail.urgency_level === 'caution' ? 'text-urgent-yellow font-bold' :
                'text-calico-black'
              }`}>
                {new Date(tail.deadline_date).toLocaleDateString('ja-JP')}
                {tail.days_remaining !== null && ` (${formatDaysRemaining()})`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}