import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import AlbumClient from './AlbumClient';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const currentSlug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();

  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('slug', currentSlug)
    .maybeSingle();

  return {
    title: event?.title ? `${event.title} • FotCabine` : 'Álbum Digital • FotCabine',
    description: 'Álbum oficial de fotos do evento',
  };
}

export default async function EventPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();
  return <AlbumClient slug={slug} />;
}
