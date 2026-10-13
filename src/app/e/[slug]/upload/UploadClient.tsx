'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
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
        <h2 className="text-xl font-bold mb-2">Evento não encontrado</h2>
        <p className="text-zinc-500 text-xs font-mono">Slug: "{currentSlug}"</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative flex flex-col justify-between">
      {/* Background Marca D'água */}
      {event.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter saturate-50 contrast-125 z-0"
          style={{ backgroundImage: `url('${event.bg_image_url}')` }}
        />
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/90 pointer-events-none z-0" />

      {/* Barra Superior FotCabine */}
      <header className="relative z-10 bg-black/90 border-b-4 border-[#FF6600] px-6 py-4 shadow-md backdrop-blur-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Image
            src="/logo-fundo-preto.png"
            alt="FotCabine"
            width={130}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="text-xs text-[#FF6600] font-medium uppercase tracking-wider">
            Envio de Fotos
          </span>
        </div>
      </header>

      {/* Formulário Central */}
      <main className="relative z-10 max-w-lg mx-auto w-full p-6 flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-white">{event.title}</h1>
          <p className="text-xs text-zinc-400 mt-1">Compartilhe suas fotos tiradas neste evento</p>
        </div>

        {uploadComplete ? (
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <h2 className="text-2xl font-bold mb-2 text-white">Fotos enviadas com sucesso!</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Suas fotos já foram adicionadas ao álbum oficial.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/e/${currentSlug}`}
                className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white font-semibold py-3 rounded-xl transition text-center shadow-md shadow-[#FF6600]/20"
              >
                Ver Álbum do Evento
              </Link>
              <button
                onClick={() => {
                  setUploadComplete(false);
                  setSelectedFiles([]);
                  setUploadProgress(0);
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl transition text-sm"
              >
                Enviar mais fotos
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">
                Seu Nome (Opcional)
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: Felipe Teixeira"
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">
                Selecione as Fotos
              </label>
              <label className="border-2 border-dashed border-zinc-700 hover:border-[#FF6600] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-black/40">
                <UploadCloud className="text-[#FF6600] mb-2" size={38} />
                <span className="text-sm font-medium text-zinc-200 text-center">Clique para escolher do celular / computador</span>
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
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
                <ImageIcon className="text-[#FF6600]" size={20} />
                <span className="text-xs text-zinc-200">
                  {selectedFiles.length} foto(s) selecionada(s)
                </span>
              </div>
            )}

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Enviando fotos...</span>
                  <span className="text-[#FF6600] font-semibold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-zinc-800">
                  <div
                    className="bg-[#FF6600] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6600]/25"
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

      <footer className="relative z-10 text-center py-5 text-xs text-zinc-500 border-t border-zinc-900 bg-black/60">
        FotCabine • Álbum Digital do Evento
      </footer>
    </div>
  );
}
