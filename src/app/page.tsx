import { Search, Clock } from 'lucide-react'
import TailGrid from '@/components/TailGrid'
import StatsDisplay from '@/components/StatsDisplay'

export default function HomePage() {
  return (
    <div className="container py-8">
      {/* ヒーローセクション */}
      <section className="text-center mb-12">
        <div className="mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-calico-brown mb-4 text-shadow">
            🐾 Tail Match
          </h1>
          <p className="text-lg md:text-xl text-calico-black mb-6">
            1匹でも多くの猫を救うために<br />
            全国の保護猫情報をまとめてお届けします
          </p>
        </div>
        
        {/* 緊急度の高い猫の表示エリア */}
        <div className="bg-urgent-red text-white p-6 rounded-lg mb-8">
          <div className="flex items-center justify-center mb-4">
            <Clock className="mr-2" size={24} />
            <h2 className="text-xl font-bold">緊急！残り時間わずか</h2>
          </div>
          <p className="text-sm opacity-90 mb-4">
            以下の尻尾ちゃんたちは、残り時間がわずかです。
          </p>
          <div className="mt-4">
            <TailGrid showUrgentOnly={true} maxCount={6} />
          </div>
        </div>
      </section>

      {/* 検索セクション */}
      <section className="mb-12">
        <div className="card max-w-2xl mx-auto">
          <div className="flex items-center mb-4">
            <Search className="mr-2 text-denim" size={24} />
            <h2 className="text-xl font-bold text-calico-brown">尻尾ちゃんを探す</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">お住まいの地域</label>
              <select className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent">
                <option value="">地域を選択してください</option>
                <option value="hokkaido">北海道</option>
                <option value="tohoku">東北</option>
                <option value="kanto">関東</option>
                <option value="chubu">中部</option>
                <option value="kansai">関西</option>
                <option value="chugoku">中国</option>
                <option value="shikoku">四国</option>
                <option value="kyushu">九州・沖縄</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">性別</label>
                <select className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent">
                  <option value="">指定なし</option>
                  <option value="male">オス</option>
                  <option value="female">メス</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">年齢</label>
                <select className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent">
                  <option value="">指定なし</option>
                  <option value="kitten">子猫（1歳未満）</option>
                  <option value="adult">成猫（1-7歳）</option>
                  <option value="senior">シニア猫（7歳以上）</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">猫種</label>
                <select className="w-full p-3 border border-calico-cream rounded-lg focus:ring-2 focus:ring-denim focus:border-transparent">
                  <option value="">指定なし</option>
                  <option value="mixed">ミックス</option>
                  <option value="persian">ペルシャ</option>
                  <option value="siamese">シャム</option>
                  <option value="maine-coon">メインクーン</option>
                </select>
              </div>
            </div>
            
            <button className="btn-primary w-full py-3 text-lg">
              <Search className="inline mr-2" size={20} />
              尻尾ちゃんを探す
            </button>
          </div>
        </div>
      </section>

      {/* 統計情報 */}
      <section>
        <StatsDisplay />
      </section>

      {/* お知らせ */}
      <section className="card">
        <h2 className="text-xl font-bold text-calico-brown mb-4">📢 お知らせ</h2>
        <div className="space-y-3">
          <div className="p-3 bg-calico-cream rounded-lg">
            <p className="text-sm text-calico-black">
              <strong>2024.06.29</strong> - Tail Matchをリリースしました！現在データベースを構築中です。
            </p>
          </div>
          <div className="p-3 bg-calico-cream rounded-lg">
            <p className="text-sm text-calico-black">
              <strong>準備中</strong> - 各自治体との連携を順次開始いたします。
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}