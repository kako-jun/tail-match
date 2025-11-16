import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ているまっち！ - 全国の保護動物マッチングサービス',
  description: '日本全国の自治体保護動物（猫・犬）情報を集約し、殺処分を防ぐためのマッチングサービス',
  keywords: ['保護猫', '保護犬', '里親', 'マッチング', '自治体', '猫', '犬', '救助'],
  authors: [{ name: 'kako-jun' }],
  openGraph: {
    title: 'ているまっち！ - 全国の保護動物マッチングサービス',
    description: '1匹でも多くの動物を救うために。全国の保護猫・保護犬情報をまとめてお届けします。',
    url: 'https://tail-match.llll-ll.com',
    siteName: 'ているまっち！',
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