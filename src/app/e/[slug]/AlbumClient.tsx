'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Loader2 } from 'lucide-react';

export default function AlbumClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const currentSlug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();

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
        <Loader2 className="animate-spin text-[#FF6600]" size={36} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Image
          src="/logo-fundo-preto.png"
          alt="FotCabine"
          width={160}
          height={50}
          className="h-10 w-auto object-contain mb-4"
        />
        <h2 className="text-xl font-bold text-white mb-2">Álbum não encontrado</h2>
        <p className="text-zinc-500 text-xs">Verifique o link enviado pelo anfitrião ou contate a organização.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden flex flex-col justify-between">
      {/* Background Personalizado do Evento com Marca D'água */}
      {event.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter saturate-50 contrast-125 z-0"
          style={{ backgroundImage: `url('${event.bg_image_url}')` }}
        />
      )}

      {/* Camada Escura */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/90 pointer-events-none z-0" />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        
        {/* Barra Superior FotCabine */}
        <header className="bg-black/90 border-b-4 border-[#FF6600] px-6 py-4 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Image
              src="/logo-fundo-preto.png"
              alt="FotCabine"
              width={140}
              height={45}
              className="h-9 w-auto object-contain"
              priority
            />
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              Álbum Oficial
            </span>
          </div>
        </header>

        {/* Título e Ação do Álbum */}
        <section className="text-center py-12 px-4 flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-wide drop-shadow text-white">
            {event.title}
          </h1>
          <p className="mt-2 text-sm md:text-base text-[#FF6600] font-medium tracking-wide">
            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={downloadAllAsZip}
              disabled={downloading || photos.length === 0}
              className="inline-flex items-center gap-2 bg-[#FF6600] hover:bg-[#E65C00] text-white px-8 py-3.5 rounded-full transition disabled:opacity-40 shadow-lg shadow-[#FF6600]/25 font-semibold text-sm md:text-base tracking-wide cursor-pointer"
            >
              <Download size={18} />
              {downloading ? 'Baixando fotos...' : `Baixar Todas as Fotos (${photos.length})`}
            </button>
          </div>
        </section>

        {/* Galeria de Fotos */}
        <section className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
          {photos.length === 0 ? (
            <p className="text-center text-zinc-400 mt-16 font-light">
              Nenhuma foto enviada até o momento.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-md"
                >
                  <img
                    src={p.image_url}
                    alt="Foto do evento"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rodapé Oficial */}
        <footer className="py-6 text-xs text-zinc-400 border-t border-zinc-800 bg-black/80 flex flex-col items-center justify-center gap-2">
          <Image
            src="/logo-fundo-preto.png"
            alt="FotCabine"
            width={90}
            height={28}
            className="h-5 w-auto object-contain opacity-70"
          />
          <span>FotCabine • Transformando o seu Sonho em um Evento de Sucesso</span>
        </footer>
      </div>
    </div>
  );
}
