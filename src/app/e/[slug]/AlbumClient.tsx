'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Loader2, X, ZoomIn } from 'lucide-react';

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
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

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
          const { data: photosData, error: photosErr } = await supabase
            .from('photos')
            .select('*')
            .eq('event_id', eventData.id)
            .order('created_at', { ascending: false });

          if (photosErr) console.error('Erro ao buscar fotos:', photosErr);
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
        <p className="text-zinc-500 text-xs">Verifique o link enviado pelo anfitrião.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden flex flex-col justify-between">
      {/* Background do Evento */}
      {event.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter saturate-50 contrast-125 z-0"
          style={{ backgroundImage: `url('${event.bg_image_url}')` }}
        />
      )}

      {/* Camada Escura */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/95 pointer-events-none z-0" />

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
        <section className="text-center py-8 px-4 flex flex-col items-center">
          <h1 className="text-2xl md:text-4xl font-serif font-bold tracking-wide drop-shadow text-white">
            {event.title}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#FF6600] font-medium tracking-wide">
            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}
          </p>

          <div className="mt-5 flex justify-center">
            <button
              onClick={downloadAllAsZip}
              disabled={downloading || photos.length === 0}
              className="inline-flex items-center gap-2 bg-[#FF6600] hover:bg-[#E65C00] text-white px-6 py-3 rounded-full transition disabled:opacity-40 shadow-lg shadow-[#FF6600]/25 font-semibold text-xs md:text-sm tracking-wide cursor-pointer"
            >
              <Download size={16} />
              {downloading ? 'Baixando fotos...' : `Baixar Todas as Fotos (${photos.length})`}
            </button>
          </div>
        </section>

        {/* Galeria de Miniaturas Compactas */}
        <section className="max-w-5xl mx-auto w-full px-4 py-4 flex-1">
          {photos.length === 0 ? (
            <p className="text-center text-zinc-400 mt-16 font-light text-sm">
              Nenhuma foto enviada até o momento.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3.5">
              {photos.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActivePhoto(p.image_url)}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 shadow cursor-pointer hover:border-[#FF6600] transition"
                >
                  <img
                    src={p.image_url}
                    alt="Foto do evento"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <ZoomIn size={18} className="text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rodapé Oficial */}
        <footer className="py-5 text-xs text-zinc-500 border-t border-zinc-900 bg-black/80 flex flex-col items-center justify-center gap-1.5">
          <Image
            src="/logo-fundo-preto.png"
            alt="FotCabine"
            width={80}
            height={25}
            className="h-4 w-auto object-contain opacity-60"
          />
          <span>FotCabine • Álbum Digital do Evento</span>
        </footer>
      </div>

      {/* Modal Tela Cheia com "X" de Fechar */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md"
          onClick={() => setActivePhoto(null)}
        >
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-4 right-4 z-50 bg-zinc-800/80 hover:bg-[#FF6600] text-white p-2.5 rounded-full border border-white/20 transition shadow-lg cursor-pointer"
            title="Fechar Visualização"
          >
            <X size={22} />
          </button>

          <div 
            className="relative max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activePhoto}
              alt="Visualização ampliada"
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl border border-zinc-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
