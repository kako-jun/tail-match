import { Search, Clock } from 'lucide-react'
import TailGrid from '@/components/TailGrid'
import StatsDisplay from '@/components/StatsDisplay'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="hero-gradient relative overflow-hidden py-24 lg:py-32">
        <div className="container relative z-10">
          <div className="text-center mb-20">
            <div className="mb-12">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold bg-gradient-to-r from-calico-brown via-pink-paw to-denim bg-clip-text text-transparent mb-8 text-shadow">
                🐾 Tail Match
              </h1>
              <p className="text-2xl md:text-3xl lg:text-4xl text-gray-800 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
                1匹でも多くの猫を救うために<br />
                <span className="font-bold bg-gradient-to-r from-calico-brown to-pink-600 bg-clip-text text-transparent">全国の保護猫情報</span>をまとめてお届けします
              </p>
            </div>
            
            {/* 緊急度の高い猫の表示エリア */}
            <div className="urgent-alert p-8 mb-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-500/20 animate-pulse"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <Clock className="mr-3 animate-pulse" size={28} />
                  <h2 className="text-2xl md:text-3xl font-bold">緊急！残り時間わずか</h2>
                </div>
                <p className="text-lg opacity-95 mb-6 max-w-2xl mx-auto">
                  以下の尻尾ちゃんたちは、残り時間がわずかです。<br />
                  <span className="font-semibold">今すぐ行動を起こしてください。</span>
                </p>
                <div className="mt-8">
                  <TailGrid showUrgentOnly={true} maxCount={6} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 装飾的な背景要素 */}
        <div className="absolute top-10 left-10 text-6xl opacity-10 animate-bounce">🐾</div>
        <div className="absolute top-32 right-20 text-4xl opacity-20 animate-pulse">❤️</div>
        <div className="absolute bottom-20 left-20 text-5xl opacity-15 animate-bounce delay-1000">🏠</div>
      </section>

      {/* 検索セクション */}
      <section className="py-20 lg:py-24 bg-gradient-to-b from-white/50 to-transparent">
        <div className="container">
          <div className="search-card max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-gradient-to-r from-denim to-blue-600 p-3 rounded-2xl mr-4">
                <Search className="text-white" size={28} />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-calico-brown to-denim bg-clip-text text-transparent">
                尻尾ちゃんを探す
              </h2>
            </div>
          
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-3 text-calico-brown">🌍 お住まいの地域</label>
                <select className="custom-select w-full p-6 bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl focus:ring-4 focus:ring-orange-300/50 focus:border-orange-400 transition-all duration-300 text-xl shadow-2xl font-semibold text-gray-800 cursor-pointer hover:bg-white hover:shadow-3xl min-h-20">
                  <option value="">地域を選択してください</option>
                  <option value="hokkaido">🗾 北海道</option>
                  <option value="tohoku">🏔️ 東北</option>
                  <option value="kanto">🏙️ 関東</option>
                  <option value="chubu">🗻 中部</option>
                  <option value="kansai">🏯 関西</option>
                  <option value="chugoku">⛩️ 中国</option>
                  <option value="shikoku">🌊 四国</option>
                  <option value="kyushu">🌺 九州・沖縄</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-lg font-semibold mb-3 text-calico-brown">⚧ 性別</label>
                  <select className="custom-select w-full p-5 bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl focus:ring-4 focus:ring-orange-300/50 focus:border-orange-400 transition-all duration-300 shadow-2xl font-semibold text-gray-800 cursor-pointer hover:bg-white hover:shadow-3xl text-lg min-h-16">
                    <option value="">指定なし</option>
                    <option value="male">♂ オス</option>
                    <option value="female">♀ メス</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-lg font-semibold mb-3 text-calico-brown">🎂 年齢</label>
                  <select className="custom-select w-full p-5 bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl focus:ring-4 focus:ring-orange-300/50 focus:border-orange-400 transition-all duration-300 shadow-2xl font-semibold text-gray-800 cursor-pointer hover:bg-white hover:shadow-3xl text-lg min-h-16">
                    <option value="">指定なし</option>
                    <option value="kitten">🐱 子猫（1歳未満）</option>
                    <option value="adult">🐈 成猫（1-7歳）</option>
                    <option value="senior">👴 シニア猫（7歳以上）</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-lg font-semibold mb-3 text-calico-brown">🎨 猫種</label>
                  <select className="custom-select w-full p-5 bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl focus:ring-4 focus:ring-orange-300/50 focus:border-orange-400 transition-all duration-300 shadow-2xl font-semibold text-gray-800 cursor-pointer hover:bg-white hover:shadow-3xl text-lg min-h-16">
                    <option value="">指定なし</option>
                    <option value="mixed">🎭 ミックス</option>
                    <option value="persian">👑 ペルシャ</option>
                    <option value="siamese">🎌 シャム</option>
                    <option value="maine-coon">🦁 メインクーン</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4">
                <button className="btn-primary w-full py-4 text-xl">
                  <Search className="inline mr-3" size={24} />
                  🔍 尻尾ちゃんを探す
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 統計情報 */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-calico-brown to-denim bg-clip-text text-transparent mb-4">
              📊 リアルタイム統計
            </h2>
            <p className="text-xl text-calico-black">現在の保護猫情報をお知らせします</p>
          </div>
          <StatsDisplay />
        </div>
      </section>

      {/* お知らせ */}
      <section className="py-16">
        <div className="container">
          <div className="card-glass max-w-4xl mx-auto">
            <div className="flex items-center mb-8">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-3 rounded-2xl mr-4">
                <span className="text-white text-2xl">📢</span>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-calico-brown to-orange-500 bg-clip-text text-transparent">
                最新のお知らせ
              </h2>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl border border-green-200/50">
                <div className="flex items-start">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mr-4 mt-1">
                    2024.06.30
                  </span>
                  <div>
                    <h3 className="font-bold text-calico-brown mb-2">🎉 Phase 3 UI/UX完成！</h3>
                    <p className="text-calico-black">
                      検索・フィルタリング機能、緊急度表示システム、統計ダッシュボードが完成しました！
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200/50">
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mr-4 mt-1">
                    準備中
                  </span>
                  <div>
                    <h3 className="font-bold text-calico-brown mb-2">🔄 自治体連携拡大中</h3>
                    <p className="text-calico-black">
                      全国の自治体との連携を順次開始いたします。石川県に続き、他の都道府県も追加予定です。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}