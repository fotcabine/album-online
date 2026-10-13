'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slugParam = resolvedParams?.slug || '';
  const currentSlug = decodeURIComponent(slugParam).trim().toLowerCase();

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!currentSlug) return;
      try {
        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (eventErr) {
          console.error('Erro ao buscar evento no Supabase:', eventErr);
        }

        if (eventData) {
          setEvent(eventData);
          const { data: photosData } = await supabase
            .from('photos')
            .select('*')
            .eq('event_id', eventData.id)
            .order('created_at', { ascending: false });

          setPhotos(photosData || []);
        }
      } catch (err) {
        console.error('Erro na requisição:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentSlug]);

  const downloadAllAsZip = async () => {
    if (photos.length === 0) return;
    setDownloading(true);
    const zip = new JSZip();

    try {
      await Promise.all(
        photos.map(async (photo, index) => {
          const response = await fetch(photo.image_url);
          const blob = await response.blob();
          zip.file(`foto-${index + 1}.jpg`, blob);
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${event?.slug || 'album'}-todas-as-fotos.zip`);
    } catch (err) {
      console.error(err);
      alert('Erro ao transferir as fotos.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Evento não encontrado</h2>
        <p className="text-zinc-500 text-xs font-mono mb-4">Slug procurado: "{currentSlug}"</p>
        <Link href="/admin" className="text-blue-400 underline text-sm">
          Acessar Painel Administrativo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden">
      {event.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter saturate-50 contrast-125 z-0"
          style={{ backgroundImage: `url('${event.bg_image_url}')` }}
        />
      )}

      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90 pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        <header className="text-center py-16 px-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <h1 className="text-4xl md:text-6xl font-serif tracking-wide drop-shadow-lg text-white">
            {event.title}
          </h1>
          <p className="mt-3 text-lg md:text-xl font-light tracking-widest text-zinc-300">
            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={downloadAllAsZip}
              disabled={downloading || photos.length === 0}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-8 py-3.5 rounded-full backdrop-blur-md border border-white/30 transition disabled:opacity-40 shadow-lg cursor-pointer font-medium text-sm md:text-base tracking-wide"
            >
              <Download size={18} />
              {downloading ? 'Baixando fotos...' : `Baixar Todas as Fotos (${photos.length})`}
            </button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto w-full px-4 py-12 flex-1">
          {photos.length === 0 ? (
            <p className="text-center text-zinc-400 mt-16 font-light">
              Nenhuma fotografia enviada até ao momento.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900/90 border border-white/15 shadow-md"
                >
                  <img
                    src={p.image_url}
                    alt="Foto enviada"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-6 text-xs text-zinc-500 border-t border-white/5">
          Álbum Digital do Evento
        </footer>
      </div>
    </div>
  );
}
