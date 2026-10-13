'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { UploadCloud, CheckCircle, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function UploadClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const currentSlug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      if (!currentSlug) return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar evento:', error);
        }
        if (data) {
          setEvent(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [currentSlug]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !event) return;

    setUploading(true);
    setUploadProgress(0);

    let completed = 0;

    for (const file of selectedFiles) {
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${event.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        await supabase.from('photos').insert({
          event_id: event.id,
          image_url: publicUrlData.publicUrl,
          guest_name: guestName.trim() || 'Convidado',
        });

        completed++;
        setUploadProgress(Math.round((completed / selectedFiles.length) * 100));
      } catch (err) {
        console.error('Erro ao enviar foto:', err);
      }
    }

    setUploading(false);
    setUploadComplete(true);
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
        <h2 className="text-xl font-semibold mb-2">Evento não encontrado</h2>
        <p className="text-zinc-500 text-xs font-mono mb-4">Slug: "{currentSlug}"</p>
        <Link href="/" className="text-blue-400 underline text-sm">
          Página Inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative flex flex-col justify-between">
      {event.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter saturate-50 contrast-125 z-0"
          style={{ backgroundImage: `url('${event.bg_image_url}')` }}
        />
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 pointer-events-none z-0" />

      <header className="relative z-10 text-center py-10 px-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <h1 className="text-3xl md:text-5xl font-serif text-white">{event.title}</h1>
        <p className="mt-2 text-sm text-zinc-300">Envie suas fotos para o álbum do evento</p>
      </header>

      <main className="relative z-10 max-w-lg mx-auto w-full p-6 flex-1 flex flex-col justify-center">
        {uploadComplete ? (
          <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-2xl p-8 text-center backdrop-blur-md shadow-2xl">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <h2 className="text-2xl font-semibold mb-2">Fotos enviadas com sucesso!</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Suas fotos já estão disponíveis no álbum oficial do evento.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/e/${currentSlug}`}
                className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-zinc-200 transition text-center"
              >
                Ver Álbum do Evento
              </Link>
              <button
                onClick={() => {
                  setUploadComplete(false);
                  setSelectedFiles([]);
                  setUploadProgress(0);
                }}
                className="w-full bg-zinc-800 text-white py-3 rounded-xl hover:bg-zinc-700 transition"
              >
                Enviar mais fotos
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                Seu Nome (Opcional)
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: Felipe Teixeira"
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                Selecione as Fotos
              </label>
              <label className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-black/20">
                <UploadCloud className="text-zinc-400 mb-2" size={36} />
                <span className="text-sm font-medium text-zinc-200">Clique para escolher do celular / computador</span>
                <span className="text-xs text-zinc-500 mt-1">Formatos comuns de imagem suportados</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <ImageIcon className="text-zinc-400" size={20} />
                <span className="text-xs text-zinc-300">
                  {selectedFiles.length} foto(s) selecionada(s)
                </span>
              </div>
            )}

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Enviando fotos...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Enviando...
                </>
              ) : (
                `Enviar Fotos (${selectedFiles.length})`
              )}
            </button>

            <div className="text-center">
              <Link
                href={`/e/${currentSlug}`}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
              >
                <ArrowLeft size={14} /> Voltar ao álbum
              </Link>
            </div>
          </form>
        )}
      </main>

      <footer className="relative z-10 text-center py-6 text-xs text-zinc-500 border-t border-white/5">
        Álbum Digital do Evento
      </footer>
    </div>
  );
}
