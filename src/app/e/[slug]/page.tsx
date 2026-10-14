import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('slug', params.slug)
    .single();

  return {
    title: event ? `${event.title} • Álbum FotCabine` : 'Álbum Digital • FotCabine',
    description: 'Álbum exclusivo do evento',
  };
}