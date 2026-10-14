'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { UploadCloud, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';

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
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

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
    setLimitWarning(null);
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 3) {
        setLimitWarning('Você pode enviar no máximo 3 fotos por vez.');
        setSelectedFiles(files.slice(0, 3));
      } else {
        setSelectedFiles(files);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !event) return;

    setUploading(true);
    setUploadProgress(0);

    const filesToUpload = selectedFiles.slice(0, 3);
    let completed = 0;

    for (const file of filesToUpload) {
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
        setUploadProgress(Math.round((completed / filesToUpload.length) * 100));
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
        <p className="text-zinc-500 text-xs font-mono">Verifique o QR Code lido.</p>
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

      {/* Formulário Central (Sem atalho para ver álbum) */}
      <main className="relative z-10 max-w-lg mx-auto w-full p-6 flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-white">{event.title}</h1>
          <p className="text-xs text-zinc-400 mt-1">Envie até 3 fotos tiradas no evento</p>
        </div>

        {uploadComplete ? (
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <h2 className="text-2xl font-bold mb-2 text-white">Fotos enviadas com sucesso!</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Obrigado por compartilhar suas fotos! Elas foram salvas com segurança no álbum oficial.
            </p>
            <button
              onClick={() => {
                setUploadComplete(false);
                setSelectedFiles([]);
                setUploadProgress(0);
                setLimitWarning(null);
              }}
              className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white py-3 rounded-xl transition text-sm font-semibold shadow-lg shadow-[#FF6600]/25"
            >
              Enviar mais fotos
            </button>
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs uppercase font-medium text-zinc-400">
                  Selecione até 3 Fotos
                </label>
                <span className="text-[11px] text-[#FF6600] font-mono">Máx: 3 fotos</span>
              </div>
              <label className="border-2 border-dashed border-zinc-700 hover:border-[#FF6600] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-black/40">
                <UploadCloud className="text-[#FF6600] mb-2" size={38} />
                <span className="text-sm font-medium text-zinc-200 text-center">Clique para escolher do celular</span>
                <span className="text-xs text-zinc-500 mt-1">Limite máximo de 3 fotos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {limitWarning && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-center">
                {limitWarning}
              </p>
            )}

            {selectedFiles.length > 0 && (
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="text-[#FF6600]" size={18} />
                  <span className="text-xs text-zinc-200">
                    {selectedFiles.length} foto(s) selecionada(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-[11px] text-zinc-400 hover:text-white"
                >
                  Limpar
                </button>
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
                `Enviar ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} Fotos`
              )}
            </button>
          </form>
        )}
      </main>

      <footer className="relative z-10 text-center py-5 text-xs text-zinc-500 border-t border-zinc-900 bg-black/60">
        FotCabine • Álbum Digital do Evento
      </footer>
    </div>
  );
}
