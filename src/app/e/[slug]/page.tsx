import { Suspense } from 'react';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import AlbumClient from './AlbumClient';
import { Loader2 } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
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
  } catch {
    return {
      title: 'Álbum Digital • FotCabine',
    };
  }
}

async function AlbumContainer({ params }: Props) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();
  return <AlbumClient slug={slug} />;
}

export default function EventPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <Loader2 className="animate-spin text-[#FF6600]" size={36} />
        </div>
      }
    >
      <AlbumContainer params={params} />
    </Suspense>
  );
}
