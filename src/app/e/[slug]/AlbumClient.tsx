'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Download,
  Loader2,
  X,
  ZoomIn,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

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

  // Estados da Apresentação de Slides (Modo Telão)
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Carregamento inicial do evento e fotos
  useEffect(() => {
    async function loadEvent() {
      if (!currentSlug) return;
      try {
        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (eventErr) console.error('Erro ao buscar evento:', eventErr);

        if (eventData) {
          setEvent(eventData);
          await fetchPhotos(eventData.id);
        }
      } catch (err) {
        console.error('Erro na requisição inicial:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [currentSlug]);

  const fetchPhotos = async (eventId: string) => {
    const { data: photosData, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (!error && photosData) {
      setPhotos((prev) => {
        // Atualiza somente se houver quantidade diferente para evitar re-renderizações desnecessárias
        if (photosData.length !== prev.length) {
          return photosData;
        }
        return prev;
      });
    }
  };

  // 2. Atualização periódica em Tempo Real (Polling a cada 8 segundos)
  useEffect(() => {
    if (!event?.id) return;

    const interval = setInterval(() => {
      fetchPhotos(event.id);
    }, 8000); // 8 segundos

    return () => clearInterval(interval);
  }, [event?.id]);

  // 3. Controle do Slideshow (Apresentação no Telão a cada 4 segundos)
  useEffect(() => {
    if (!isSlideshow || !isPlaying || photos.length === 0) {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
      return;
    }

    slideshowTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 4500); // Tempo de troca entre as fotos (4.5 segundos)

    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [isSlideshow, isPlaying, photos.length]);

  // Atalhos de teclado no Slideshow (ESC para sair, setas para navegar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSlideshow) return;
      if (e.key === 'Escape') setIsSlideshow(false);
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlideshow, photos.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const startSlideshow = () => {
    if (photos.length === 0) return;
    setCurrentIndex(0);
    setIsPlaying(true);
    setIsSlideshow(true);
  };

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

      {/* Conteúdo Principal */}
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
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-400 font-mono">Ao Vivo</span>
            </div>
          </div>
        </header>

        {/* Cabeçalho do Álbum e Botões de Ação */}
        <section className="text-center py-8 px-4 flex flex-col items-center">
          <h1 className="text-2xl md:text-4xl font-serif font-bold tracking-wide drop-shadow text-white">
            {event.title}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#FF6600] font-medium tracking-wide">
            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {/* Botão de Slideshow / Telão */}
            <button
              onClick={startSlideshow}
              disabled={photos.length === 0}
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-[#FF6600]/40 px-6 py-3 rounded-full transition disabled:opacity-40 shadow-lg font-semibold text-xs md:text-sm tracking-wide cursor-pointer hover:border-[#FF6600]"
            >
              <Maximize2 size={16} className="text-[#FF6600]" />
              Apresentação no Telão
            </button>

            {/* Botão de Download */}
            <button
              onClick={downloadAllAsZip}
              disabled={downloading || photos.length === 0}
              className="inline-flex items-center gap-2 bg-[#FF6600] hover:bg-[#E65C00] text-white px-6 py-3 rounded-full transition disabled:opacity-40 shadow-lg shadow-[#FF6600]/25 font-semibold text-xs md:text-sm tracking-wide cursor-pointer"
            >
              <Download size={16} />
              {downloading ? 'Baixando fotos...' : `Baixar Fotos (${photos.length})`}
            </button>
          </div>
        </section>

        {/* Galeria de Miniaturas Compactas */}
        <section className="max-w-5xl mx-auto w-full px-4 py-4 flex-1">
          {photos.length === 0 ? (
            <p className="text-center text-zinc-400 mt-16 font-light text-sm">
              Nenhuma foto enviada até o momento. As novas fotos aparecerão aqui automaticamente.
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

      {/* MODAL 1: FOTO EXPANDIDA INDIVIDUAL COM "X" */}
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

      {/* MODAL 2: MODO APRESENTAÇÃO / TELÃO (SLIDESHOW) */}
      {isSlideshow && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-8 select-none">
          {/* Barra Superior do Telão */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800">
              <Image
                src="/logo-fundo-preto.png"
                alt="FotCabine"
                width={110}
                height={35}
                className="h-7 w-auto object-contain"
              />
              <div className="border-l border-zinc-700 pl-3">
                <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-md">{event.title}</p>
                <p className="text-[10px] text-[#FF6600]">
                  Foto {currentIndex + 1} de {photos.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying((prev) => !prev)}
                className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 p-2.5 rounded-full text-white transition cursor-pointer"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="text-[#FF6600]" />}
              </button>
              <button
                onClick={() => setIsSlideshow(false)}
                className="bg-zinc-900/80 hover:bg-red-600 border border-zinc-700 p-2.5 rounded-full text-white transition cursor-pointer"
                title="Sair da Apresentação"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Área Central da Imagem com Animação Fluida */}
          <div className="flex-1 flex items-center justify-center relative my-2 overflow-hidden">
            <button
              onClick={prevSlide}
              className="absolute left-2 sm:left-6 z-20 bg-black/50 hover:bg-[#FF6600] text-white p-3 rounded-full border border-white/10 transition cursor-pointer"
            >
              <ChevronLeft size={28} />
            </button>

            <div className="relative w-full h-full flex items-center justify-center">
              <img
                key={photos[currentIndex]?.id}
                src={photos[currentIndex]?.image_url}
                alt="Foto do Telão"
                className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl transition-opacity duration-700 animate-fadeIn"
              />
            </div>

            <button
              onClick={nextSlide}
              className="absolute right-2 sm:right-6 z-20 bg-black/50 hover:bg-[#FF6600] text-white p-3 rounded-full border border-white/10 transition cursor-pointer"
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Barra Inferior com Indicador de Convidado */}
          <div className="text-center z-10">
            {photos[currentIndex]?.guest_name && (
              <span className="inline-block bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-zinc-800 text-xs text-zinc-300">
                Enviada por: <strong className="text-white">{photos[currentIndex].guest_name}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
