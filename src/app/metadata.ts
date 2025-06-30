import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tail Match - 全国の保護猫マッチングサービス',
  description: '日本全国の自治体保護猫情報を集約し、殺処分を防ぐためのマッチングサービス',
  keywords: ['保護猫', '里親', 'マッチング', '自治体', '猫', '救助'],
  authors: [{ name: 'kako-jun' }],
  openGraph: {
    title: 'Tail Match - 全国の保護猫マッチングサービス',
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