import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, MapPin, Phone, ExternalLink, ArrowLeft, Heart } from 'lucide-react'
import { getTailById } from '@/lib/tails'

interface TailDetailPageProps {
  params: { id: string }
}

export default async function TailDetailPage({ params }: TailDetailPageProps) {
  const id = parseInt(params.id)
  
  if (isNaN(id)) {
    notFound()
  }

  const tail = await getTailById(id)
  
  if (!tail) {
    notFound()
  }

  // 緊急度による背景色
  const getUrgencyBgClass = () => {
    switch (tail.urgency_level) {
      case 'urgent': return 'bg-urgent-red text-white'
      case 'warning': return 'bg-urgent-orange text-white'
      case 'caution': return 'bg-urgent-yellow text-calico-black'
      default: return 'bg-calico-cream text-calico-black'
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

  return (
    <div className="container py-8">
      {/* 戻るボタン */}
      <div className="mb-6">
        <Link href="/tails" className="inline-flex items-center text-denim hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          尻尾ちゃん一覧に戻る
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 画像エリア */}
        <div className="space-y-4">
          {/* メイン画像 */}
          <div className="aspect-square bg-calico-cream rounded-lg overflow-hidden relative">
            <img
              src={tail.images && tail.images.length > 0 ? tail.images[0] : '/images/no-image-cat.svg'}
              alt={tail.name || '保護猫'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/images/no-image-cat.svg'
              }}
            />
            
            {/* 譲渡決定バッジ */}
            {tail.transfer_decided && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold">
                <Heart className="inline w-4 h-4 mr-2" />
                譲渡決定済み
              </div>
            )}
          </div>

          {/* 追加画像（あれば） */}
          {tail.images && tail.images.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {tail.images.slice(1, 4).map((imageUrl, index) => (
                <div key={index} className="aspect-square bg-calico-cream rounded overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={`${tail.name || '保護猫'} 追加画像 ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/no-image-cat.svg'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 詳細情報エリア */}
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="card">
            <h1 className="text-3xl font-bold text-calico-brown mb-4">
              {tail.name || '名前未定'}
            </h1>

            {/* 緊急度表示 */}
            {tail.urgency_level !== 'normal' && tail.deadline_date && (
              <div className={`p-4 rounded-lg mb-4 ${getUrgencyBgClass()}`}>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-bold">
                    期限: {new Date(tail.deadline_date).toLocaleDateString('ja-JP')}
                    {tail.days_remaining !== null && ` (${formatDaysRemaining()})`}
                  </span>
                </div>
                {tail.urgency_level === 'urgent' && (
                  <p className="text-sm mt-2">
                    ⚠️ 非常に緊急です！すぐにお問い合わせください
                  </p>
                )}
              </div>
            )}

            {/* 基本データ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-calico-brown mb-2">基本情報</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium">品種:</dt>
                    <dd>{tail.breed || 'ミックス'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">年齢:</dt>
                    <dd>{tail.age_estimate || '不明'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">性別:</dt>
                    <dd>{
                      tail.gender === 'male' ? 'オス' :
                      tail.gender === 'female' ? 'メス' : '不明'
                    }</dd>
                  </div>
                  <div>
                    <dt className="font-medium">毛色:</dt>
                    <dd>{tail.color || '詳細不明'}</dd>
                  </div>
                  {tail.size && (
                    <div>
                      <dt className="font-medium">サイズ:</dt>
                      <dd>{tail.size}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="font-semibold text-calico-brown mb-2">保護情報</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium">保護地域:</dt>
                    <dd>
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {tail.region?.name} / {tail.municipality?.name}
                      </div>
                    </dd>
                  </div>
                  {tail.protection_date && (
                    <div>
                      <dt className="font-medium">保護日:</dt>
                      <dd>{new Date(tail.protection_date).toLocaleDateString('ja-JP')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium">ステータス:</dt>
                    <dd className={tail.transfer_decided ? 'text-green-600 font-bold' : ''}>
                      {tail.transfer_decided ? '譲渡決定済み' : '家族募集中'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* 健康状態・性格 */}
          {(tail.health_status || tail.personality || tail.special_needs) && (
            <div className="card">
              <h3 className="font-semibold text-calico-brown mb-4">詳細情報</h3>
              
              {tail.health_status && (
                <div className="mb-4">
                  <h4 className="font-medium text-calico-brown mb-2">健康状態</h4>
                  <p className="text-sm text-calico-black">{tail.health_status}</p>
                </div>
              )}

              {tail.personality && (
                <div className="mb-4">
                  <h4 className="font-medium text-calico-brown mb-2">性格</h4>
                  <p className="text-sm text-calico-black">{tail.personality}</p>
                </div>
              )}

              {tail.special_needs && (
                <div>
                  <h4 className="font-medium text-calico-brown mb-2">特別なケア</h4>
                  <p className="text-sm text-calico-black">{tail.special_needs}</p>
                </div>
              )}
            </div>
          )}

          {/* お問い合わせ先 */}
          <div className="card">
            <h3 className="font-semibold text-calico-brown mb-4">お問い合わせ先</h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-calico-brown">{tail.municipality?.name}</h4>
                
                {tail.municipality?.contact_info && (
                  <div className="mt-2 space-y-1 text-sm">
                    {tail.municipality.contact_info.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-denim" />
                        <a 
                          href={`tel:${tail.municipality.contact_info.phone}`}
                          className="text-denim hover:underline"
                        >
                          {tail.municipality.contact_info.phone}
                        </a>
                      </div>
                    )}
                    {tail.municipality.contact_info.address && (
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-2 text-denim mt-0.5" />
                        <span className="text-calico-black">
                          {tail.municipality.contact_info.address}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 元サイトへのリンク */}
              {tail.source_url && (
                <div className="pt-4 border-t border-calico-cream">
                  <a
                    href={tail.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    元の掲載ページを見る
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-calico-cream p-4 rounded-lg">
            <h3 className="font-semibold text-calico-brown mb-2">⚠️ 重要な注意事項</h3>
            <ul className="text-sm text-calico-black space-y-1">
              <li>• 譲渡には条件がある場合があります</li>
              <li>• 必ず事前に自治体にお問い合わせください</li>
              <li>• 情報は変更される可能性があります</li>
              <li>• このサイトは情報提供のみを行っています</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}