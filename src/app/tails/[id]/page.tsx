import type { Metadata } from 'next';
import { getTailById } from '@/lib/tails';
import TailDetailClient from './TailDetailClient';

export const runtime = 'edge';

interface TailDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TailDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return { title: 'シッポが見つかりません - ているまっち！' };
  }

  try {
    const tail = await getTailById(numId);

    if (!tail) {
      return { title: 'シッポが見つかりません - ているまっち！' };
    }

    const name = tail.name || '名前未定';
    const animalLabel = tail.animal_type === 'dog' ? '犬' : '猫';
    const location = [tail.region?.name, tail.municipality?.name].filter(Boolean).join(' ');
    const title = `${name} - ${location}の保護${animalLabel} | ているまっち！`;
    const description = [
      `${location}で保護されている${animalLabel}「${name}」`,
      tail.breed && `品種: ${tail.breed}`,
      tail.age_estimate && `年齢: ${tail.age_estimate}`,
      tail.personality && tail.personality.slice(0, 80),
    ]
      .filter(Boolean)
      .join('。');

    const ogImages =
      tail.images && tail.images.length > 0
        ? [{ url: tail.images[0], width: 600, height: 600, alt: name }]
        : [];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://tail-match.llll-ll.com/tails/${id}`,
        siteName: 'ているまっち！',
        locale: 'ja_JP',
        type: 'article',
        images: ogImages,
      },
      twitter: {
        card: ogImages.length > 0 ? 'summary_large_image' : 'summary',
        title,
        description,
        images: ogImages.length > 0 ? [ogImages[0].url] : [],
      },
    };
  } catch {
    return { title: 'ているまっち！ - 全国の保護動物マッチングサービス' };
  }
}

export default async function TailDetailPage({ params }: TailDetailPageProps) {
  const { id } = await params;
  return <TailDetailClient id={parseInt(id)} />;
}
