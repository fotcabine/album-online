'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { UploadCloud, CheckCircle, Loader2, Image as ImageIcon, MessageSquareHeart, Send, ArrowRight } from 'lucide-react';

export default function UploadClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const currentSlug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // MODO TESTE: Sempre abre a tela de recados (sem travar por dispositivo)
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [generatingMessageCard, setGeneratingMessageCard] = useState(false);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);

  // Estados do Envio de Fotos
  const [guestName, setGuestName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function loadEvent() {
      if (!currentSlug) return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, event_date, bg_image_url')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (error) console.error('Erro ao buscar evento:', error);
        if (data) {
          setEvent(data);
          // Modo teste ativo: sempre mostra a tela de mensagem inicialmente
          setShowWelcomeMessage(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [currentSlug]);

  // GERAÇÃO DO CARD NO MIOLO BRANCO DO BALÃO
  const generateCardBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      const bgImg = new window.Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = '/balao-recado.svg';

      bgImg.onload = () => {
        canvas.width = 1080;
        canvas.height = 1080;

        // Fundo Branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1080, 1080);

        // Desenha a ilustração do balão
        ctx.drawImage(bgImg, 0, 0, 1080, 1080);

        // Quebra e formatação da mensagem dentro do miolo útil
        ctx.fillStyle = '#18181b';
        ctx.font = 'italic 38px "Georgia", serif';
        ctx.textAlign = 'center';

        const maxWidth = 640;
        const lineHeight = 54;
        
        let formattedMessage = guestMessage.trim();
        if (!formattedMessage.startsWith('“') && !formattedMessage.startsWith('"')) {
          formattedMessage = `“${formattedMessage}”`;
        }

        const words = formattedMessage.split(' ');
        let line = '';
        const lines: string[] = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        const totalTextHeight = lines.length * lineHeight;
        let startY = 420 - totalTextHeight / 2;

        for (const l of lines) {
          ctx.fillText(l, 465, startY);
          startY += lineHeight;
        }

        // Nome do Convidado posicionado dentro da área branca
        const authorY = Math.min(startY + 45, 690);

        ctx.fillStyle = '#27272a';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(`— ${authorName.trim().toUpperCase()}`, 465, authorY);

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      };

      bgImg.onerror = () => {
        canvas.width = 1080;
        canvas.height = 1080;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1080, 1080);

        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 14;
        ctx.strokeRect(90, 90, 900, 700);

        ctx.fillStyle = '#18181b';
        ctx.font = 'italic 38px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.fillText(guestMessage.trim(), 540, 420);

        ctx.fillStyle = '#27272a';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(`— ${authorName.trim().toUpperCase()}`, 540, 520);

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      };
    });
  };

  const handleSendMessageCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestMessage.trim() || !authorName.trim() || !event) return;

    setGeneratingMessageCard(true);

    try {
      const blob = await generateCardBlob();
      if (!blob) throw new Error('Falha ao processar imagem da mensagem');

      const fileName = `${event.id}/mensagem-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      await supabase.from('photos').insert({
        event_id: event.id,
        image_url: publicUrlData.publicUrl,
        guest_name: authorName.trim(),
      });

      // Durante os testes não travamos o dispositivo
      setGuestName(authorName.trim());
      setMessageSentSuccess(true);

      setTimeout(() => {
        setMessageSentSuccess(false);
        setGuestMessage('');
        setShowWelcomeMessage(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao enviar mensagem: ' + err.message);
    } finally {
      setGeneratingMessageCard(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLimitWarning(null);
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 3) {
        setLimitWarning('Limite máximo de 3 fotos por envio.');
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
        <p className="text-zinc-500 text-xs font-mono">Por favor, leia o QR Code novamente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative flex flex-col justify-between selection:bg-[#FF6600]">
      {event.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter saturate-50 contrast-125 z-0"
          style={{ backgroundImage: `url('${event.bg_image_url}')` }}
        />
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/90 pointer-events-none z-0" />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
          <span className="text-[11px] text-[#FF6600] font-mono uppercase tracking-wider">
            {showWelcomeMessage ? 'Livro de Recados' : 'Envio de Fotos'}
          </span>
        </div>
      </header>

      {showWelcomeMessage ? (
        <main className="relative z-10 max-w-lg mx-auto w-full p-6 flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-white">{event.title}</h1>
            <p className="text-xs text-zinc-300 mt-1">
              Deixe uma mensagem especial para eternizar no álbum do anfitrião!
            </p>
          </div>

          <form
            onSubmit={handleSendMessageCard}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-[#FF6600] border-b border-zinc-800 pb-2">
              <MessageSquareHeart size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Recado para os anfitriões</span>
            </div>

            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1">Seu Nome</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ex: Larissa Oliveira"
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1">Sua Mensagem</label>
              <textarea
                required
                rows={4}
                maxLength={250}
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
                placeholder="Escreva seus votos, carinho e felicitações..."
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl p-3 text-white placeholder-zinc-500 outline-none text-sm resize-none transition"
              />
              <span className="text-[10px] text-zinc-500 block text-right mt-0.5">
                {guestMessage.length}/250 caracteres
              </span>
            </div>

            {messageSentSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs py-3 rounded-xl text-center font-medium flex items-center justify-center gap-1.5">
                <CheckCircle size={16} /> Mensagem gravada no álbum com sucesso!
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={generatingMessageCard}
                  className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white font-semibold py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6600]/25 text-sm disabled:opacity-50"
                >
                  {generatingMessageCard ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Gerando card no álbum...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Enviar Mensagem e Ir para as Fotos
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowWelcomeMessage(false)}
                  className="w-full text-zinc-400 hover:text-white py-2 text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  Pular recado e enviar apenas fotos <ArrowRight size={13} />
                </button>
              </div>
            )}
          </form>
        </main>
      ) : (
        <main className="relative z-10 max-w-lg mx-auto w-full p-6 flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-white">{event.title}</h1>
            <p className="text-xs text-zinc-400 mt-1">Envie até 3 fotos tiradas na festa</p>
          </div>

          {uploadComplete ? (
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl space-y-4">
              <CheckCircle className="mx-auto text-emerald-400" size={48} />
              <div>
                <h2 className="text-xl font-bold text-white">Fotos Recebidas!</h2>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Suas fotos foram enviadas com sucesso e já estão no álbum oficial do evento.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadComplete(false);
                  setSelectedFiles([]);
                  setUploadProgress(0);
                  setLimitWarning(null);
                }}
                className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white py-3 rounded-xl transition text-xs font-semibold shadow-lg shadow-[#FF6600]/25 cursor-pointer"
              >
                Enviar Outras Fotos
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
                  placeholder="Ex: Seu Nome"
                  className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none transition text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs uppercase font-medium text-zinc-400">
                    Selecione até 3 Fotos
                  </label>
                  <span className="text-[11px] text-[#FF6600] font-mono">Máx: 3 arquivos</span>
                </div>
                <label className="border-2 border-dashed border-zinc-700 hover:border-[#FF6600] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-black/40">
                  <UploadCloud className="text-[#FF6600] mb-2" size={38} />
                  <span className="text-sm font-medium text-zinc-200 text-center">Toque para selecionar da galeria</span>
                  <span className="text-xs text-zinc-500 mt-1">Imagens nos formatos JPEG ou PNG</span>
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
                      {selectedFiles.length} foto(s) pronta(s) para envio
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
                className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6600]/25 text-sm"
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
      )}

      <footer className="relative z-10 text-center py-5 text-xs text-zinc-600 border-t border-zinc-900 bg-black/60">
        FotCabine • Plataforma de Eventos
      </footer>
    </div>
  );
}
