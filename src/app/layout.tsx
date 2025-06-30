import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tail Match - 保護猫マッチングサービス',
  description: '日本全国の自治体保護猫情報を集約し、殺処分を防ぐためのマッチングサービス',
  keywords: ['保護猫', '里親', 'マッチング', '自治体', '猫', '救助'],
  authors: [{ name: 'kako-jun' }],
  openGraph: {
    title: 'Tail Match - 保護猫マッチングサービス',
    description: '1匹でも多くの猫を救うために。全国の保護猫情報をまとめてお届けします。',
    url: 'https://tail-match.llll-ll.com',
    siteName: 'Tail Match',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-yellow-50 text-gray-800 font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="bg-orange-700 text-white p-4">
            <div className="container mx-auto">
              <div className="flex items-center justify-between">
                <Link href="/" className="hover:opacity-90">
                  <h1 className="text-2xl font-bold">🐾 Tail Match</h1>
                  <p className="text-sm opacity-90">保護猫マッチングサービス</p>
                </Link>
                
                <nav className="hidden md:flex space-x-6">
                  <Link href="/" className="hover:text-pink-300 transition-colors">
                    ホーム
                  </Link>
                  <Link href="/tails" className="hover:text-pink-300 transition-colors">
                    尻尾ちゃん一覧
                  </Link>
                  <Link href="/api-test" className="hover:text-pink-300 transition-colors text-sm opacity-75">
                    API動作確認
                  </Link>
                </nav>
                
                {/* モバイルメニュー（簡易版） */}
                <nav className="md:hidden">
                  <Link href="/tails" className="text-sm hover:text-pink-300">
                    一覧
                  </Link>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="bg-calico-brown text-white p-4 mt-8">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-bold mb-2">🐾 Tail Match</h3>
                  <p className="text-sm opacity-90">
                    1匹でも多くの猫を救うために。<br />
                    全国の保護猫情報をお届けします。
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">サイトマップ</h4>
                  <nav className="space-y-1 text-sm">
                    <div><Link href="/" className="hover:text-calico-pink">ホーム</Link></div>
                    <div><Link href="/tails" className="hover:text-calico-pink">尻尾ちゃん一覧</Link></div>
                    <div><Link href="/api-test" className="hover:text-calico-pink">API動作確認</Link></div>
                  </nav>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">お問い合わせ</h4>
                  <p className="text-sm opacity-90 mb-2">
                    このサイトは情報提供のみを行っています。<br />
                    猫の譲渡については各自治体に直接お問い合わせください。
                  </p>
                  <div>
                    <a href="https://llll-ll.com" className="text-sm hover:text-calico-pink underline">
                      llll-ll.com
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-calico-brown/30 mt-6 pt-4 text-center">
                <p className="text-sm opacity-75">
                  © 2024 Tail Match by kako-jun | 
                  <span className="ml-2">すべての猫に愛ある家族を</span>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}