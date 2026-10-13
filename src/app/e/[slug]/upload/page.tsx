'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';

export default function GuestUploadPage() {
  const params = useParams();
  const slugParam = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const currentSlug = decodeURIComponent(slugParam || '').trim().toLowerCase();

  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setSuccess(false);

    try {
      setStatusMessage('Localizando evento...');
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('id')
        .eq('slug', currentSlug)
        .maybeSingle();

      if (eventErr || !eventData) {
        throw new Error('Evento não encontrado no banco de dados');
      }

      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusMessage(`Otimizando foto ${i + 1} de ${files.length}...`);

        let fileToUpload: File | Blob = file;
        try {
          fileToUpload = await imageCompression(file, compressionOptions);
        } catch (compErr) {
          console.warn('Usando arquivo original:', compErr);
        }

        setStatusMessage(`Enviando foto ${i + 1} de ${files.length}...`);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${eventData.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(fileName, fileToUpload, {
            contentType: file.type || 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('event-media')
          .getPublicUrl(fileName);

        await supabase.from('photos').insert({
          event_id: eventData.id,
          image_url: publicUrlData.publicUrl,
        });
      }

      setSuccess(true);
      setStatusMessage('');
    } catch (err: any) {
      console.error(err);
      alert('Erro no envio das fotos: ' + (err.message || 'Tente novamente.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-serif mb-2 tracking-wide">Compartilhe suas Fotos</h1>
        <p className="text-zinc-400 text-sm mb-6">Envie as suas fotos direto para o álbum do evento.</p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-8 cursor-pointer transition bg-zinc-800/40">
          {uploading ? (
            <Loader2 size={44} className="text-amber-400 animate-spin mb-3" />
          ) : (
            <UploadCloud size={44} className="text-zinc-400 mb-3" />
          )}

          <span className="text-sm font-medium">
            {uploading ? statusMessage : 'Escolher fotos da galeria / câmera'}
          </span>

          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {success && (
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 text-sm">
            <CheckCircle size={18} /> Fotos enviadas com sucesso!
          </div>
        )}
      </div>
    </main>
  );
}
