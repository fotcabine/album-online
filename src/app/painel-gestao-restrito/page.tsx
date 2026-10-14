'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  QrCode,
  ExternalLink,
  Calendar,
  Key,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Check,
  Copy,
  X,
  Loader2,
  RefreshCw,
  Printer,
  FileDown
} from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function SecretAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [bgImage, setBgImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Modais de QR Code e Arte
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [activeEventData, setActiveEventData] = useState<any | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Referência do card da arte para conversão em PDF
  const printCardRef = useRef<HTMLDivElement>(null);

  // Edição de evento
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editBgImage, setEditBgImage] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Moderação de fotos
  const [managingPhotosEvent, setManagingPhotosEvent] = useState<any | null>(null);
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Senha do painel administrativo
  const ADMIN_PIN = '1234';

  const generateRandomCode = () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSlug(result);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      fetchEvents();
    } else {
      alert('Senha incorreta.');
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, photos(count)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setEvents(data);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let bgImageUrl = null;

      if (bgImage) {
        const fileExt = bgImage.name.split('.').pop();
        const fileName = `bg-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, bgImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        bgImageUrl = publicUrlData.publicUrl;
      }

      const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');

      const { data: insertedEvent, error: insertError } = await supabase
        .from('events')
        .insert([
          {
            title,
            slug: cleanSlug,
            event_date: eventDate,
            bg_image_url: bgImageUrl,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setTitle('');
      setSlug('');
      setEventDate('');
      setBgImage(null);
      fetchEvents();

      // Já abre a arte pronta com o QR Code imediatamente após criar!
      if (insertedEvent) {
        openQrModal(insertedEvent);
      }
    } catch (err: any) {
      alert('Erro ao criar evento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventTitle: string) => {
    if (!confirm(`Deseja realmente eliminar o evento "${eventTitle}" e todas as fotos associadas?`)) return;
    try {
      await supabase.from('photos').delete().eq('event_id', id);
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (err: any) {
      alert('Erro ao eliminar evento: ' + err.message);
    }
  };

  const handleStartEdit = (evt: any) => {
    setEditingEvent(evt);
    setEditTitle(evt.title);
    setEditDate(evt.event_date);
    setEditBgImage(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEdit(true);

    try {
      let bgImageUrl = editingEvent.bg_image_url;

      if (editBgImage) {
        const fileExt = editBgImage.name.split('.').pop();
        const fileName = `bg-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, editBgImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        bgImageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('events')
        .update({
          title: editTitle,
          event_date: editDate,
          bg_image_url: bgImageUrl,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      alert('Erro ao atualizar evento: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const openManagePhotos = async (evt: any) => {
    setManagingPhotosEvent(evt);
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', evt.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setEventPhotos(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Deseja excluir esta foto do álbum?')) return;
    try {
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
      fetchEvents();
    } catch (err: any) {
      alert('Erro ao eliminar foto: ' + err.message);
    }
  };

  const openQrModal = async (eventObj: any) => {
    setActiveEventData(eventObj);
    const uploadUrl = `https://albumonline.fotcabine.com.br/e/${eventObj.slug}/upload`;
    setQrModalUrl(uploadUrl);
    try {
      const qrData = await QRCode.toDataURL(uploadUrl, {
        width: 500,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeImage(qrData);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadPdfA4 = async () => {
    if (!printCardRef.current || !activeEventData) return;
    setGeneratingPdf(true);

    try {
      const element = printCardRef.current;
      const canvas = await html2canvas(element, {
        scale: 3, // Alta resolução para impressão
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // Cria folha A4 em milímetros (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Dimensões do cartão de mesa: 100 mm x 150 mm
      const cardWidth = 100;
      const cardHeight = 150;

      // Cartão 1 (Lado Esquerdo da A4)
      pdf.addImage(imgData, 'JPEG', 5, 20, cardWidth, cardHeight);

      // Cartão 2 (Lado Direito da A4 - para imprimir 2 cartões por folha)
      pdf.addImage(imgData, 'JPEG', 105, 20, cardWidth, cardHeight);

      // Linha sutil de guia de corte central
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(105, 10, 105, 280);

      pdf.save(`Display-10x15-${activeEventData.slug || 'evento'}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao processar PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="bg-black border-b-4 border-[#FF6600] px-6 py-4 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-fundo-preto.png"
              alt="FotCabine"
              width={160}
              height={50}
              className="h-10 w-auto object-contain"
              priority
            />
            <div className="border-l border-zinc-700 pl-3 hidden sm:block">
              <h1 className="text-white text-base font-semibold leading-tight">Álbum Digital Online</h1>
              <p className="text-zinc-400 text-xs">Acesso restrito</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handleLogin}
            className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-5 text-center"
          >
            <div className="h-12 w-12 mx-auto rounded-full bg-[#FF6600]/10 border border-[#FF6600]/30 flex items-center justify-center">
              <Key className="text-[#FF6600]" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Painel Restrito</h2>
              <p className="text-xs text-zinc-400 mt-1">Introduza a sua senha para gerenciar.</p>
            </div>

            <input
              type="password"
              placeholder="Senha de acesso"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-3 text-white text-center tracking-widest text-lg outline-none transition"
              autoFocus
            />

            <button
              type="submit"
              className="w-full bg-[#FF6600] hover:bg-[#E65C00] text-white font-semibold py-3 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-[#FF6600]/20"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="bg-black border-b-4 border-[#FF6600] px-6 py-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/logo-fundo-preto.png"
            alt="FotCabine"
            width={160}
            height={50}
            className="h-10 w-auto object-contain"
            priority
          />
          <div className="border-l border-zinc-700 pl-3 hidden sm:block">
            <h1 className="text-white text-base font-semibold leading-tight">Gerenciador de Eventos</h1>
            <p className="text-zinc-400 text-xs font-mono">albumonline.fotcabine.com.br</p>
          </div>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 px-4 py-2 rounded-lg transition"
        >
          Sair
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        {/* Formulário Novo Evento */}
        <form onSubmit={handleCreateEvent} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#FF6600]/10 flex items-center justify-center">
                <Plus className="text-[#FF6600]" size={18} />
              </div>
              <h2 className="text-lg font-bold text-white">Cadastrar Novo Evento</h2>
            </div>
            <button
              type="button"
              onClick={generateRandomCode}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-[#FF6600] border border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw size={12} /> Gerar Código Mascarado
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">Título do Evento</label>
              <input
                type="text"
                required
                placeholder="Ex: 15 Anos Ana Luiza"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">
                Código do Link (Máscara / Slug)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: k7m29p"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">Data do Evento</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">Arte de Fundo / Marca de Água (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBgImage(e.target.files ? e.target.files[0] : null)}
              className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6600] hover:bg-[#E65C00] text-white font-semibold px-6 py-3 rounded-xl transition duration-200 text-sm cursor-pointer disabled:opacity-50 shadow-md shadow-[#FF6600]/20"
          >
            {loading ? 'Criando evento...' : 'Criar Evento e Gerar Arte'}
          </button>
        </form>

        {/* Lista de Eventos */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Eventos Ativos
            <span className="text-xs font-normal bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full">
              {events.length}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((evt) => {
              const albumUrl = `https://albumonline.fotcabine.com.br/e/${evt.slug}`;
              const uploadUrl = `https://albumonline.fotcabine.com.br/e/${evt.slug}/upload`;
              const photoCount = evt.photos?.[0]?.count ?? 0;

              return (
                <div
                  key={evt.id}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{evt.title}</h3>
                          <span className="bg-[#FF6600]/15 text-[#FF6600] border border-[#FF6600]/30 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ImageIcon size={11} /> {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 font-mono">
                          <Calendar size={13} className="text-[#FF6600]" /> {evt.event_date}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(evt)}
                          title="Editar Título, Data ou Background"
                          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          title="Eliminar Evento"
                          className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {evt.bg_image_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                        <ImageIcon size={13} className="text-[#FF6600]" />
                        <span>Fundo personalizado ativo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 border-t border-zinc-800 pt-3">
                    <button
                      onClick={() => openManagePhotos(evt)}
                      className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer"
                    >
                      <ImageIcon size={14} className="text-[#FF6600]" /> Moderação / Excluir Fotos ({photoCount})
                    </button>

                    <div className="flex items-center justify-between text-xs bg-black/60 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-400">Álbum Oficial:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copyToClipboard(albumUrl)}
                          className="hover:text-white text-zinc-400 transition cursor-pointer"
                          title="Copiar Link do Álbum"
                        >
                          {copiedUrl === albumUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a
                          href={albumUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#FF6600] hover:underline flex items-center gap-1 font-medium font-mono text-[11px]"
                        >
                          /e/{evt.slug} <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-black/60 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-400">QR Code / Arte de Mesa:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copyToClipboard(uploadUrl)}
                          className="hover:text-white text-zinc-400 transition cursor-pointer"
                          title="Copiar Link de Upload"
                        >
                          {copiedUrl === uploadUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => openQrModal(evt)}
                          className="text-[#FF6600] hover:text-[#E65C00] flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          Ver Arte & Baixar PDF <QrCode size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL: ARTE DE MESA 10x15 PRONTA E DOWNLOAD EM PDF A4 */}
      {qrModalUrl && activeEventData && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-lg w-full text-center space-y-4 shadow-2xl my-auto">
            
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Arte Pronta para o Display (10x15 cm)</h3>
                <p className="text-xs text-zinc-400">Evento: {activeEventData.title}</p>
              </div>
              <button
                onClick={() => {
                  setQrModalUrl(null);
                  setActiveEventData(null);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* CARD 10x15 CM VISUAL EM FUNDO BRANCO CLEAN */}
            <div className="flex justify-center py-2 overflow-x-auto">
              <div
                ref={printCardRef}
                style={{ width: '360px', height: '540px' }}
                className="bg-white text-zinc-900 border border-zinc-300 rounded-xl p-6 flex flex-col justify-between text-center shadow-lg relative select-none"
              >
                {/* Linha de Destaque Superior */}
                <div>
                  <div className="w-10 h-1 bg-[#FF6600] mx-auto mb-2 rounded-full" />
                  
                  <div className="flex justify-center mb-1">
                    <img
                      src="/logo-fundo-branco.png"
                      alt="FotCabine"
                      className="h-6 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <h2 className="text-base font-extrabold uppercase tracking-tight text-black leading-tight">
                    Minha Festa pelo seu Olhar
                  </h2>
                  <p className="text-[11px] font-bold text-[#FF6600] tracking-wider uppercase mt-0.5">
                    Ajude a completar o nosso álbum!
                  </p>
                </div>

                {/* Mensagem Afetiva */}
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-2.5 my-1">
                  <p className="text-[10px] text-zinc-600 leading-snug">
                    Muito obrigado por viver este dia especial com a gente! Aproveite cada instante da festa e compartilhe seus melhores registros para ficarem eternizados no nosso <strong>álbum exclusivo</strong>.
                  </p>
                </div>

                {/* Instruções de Envio */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-800 mb-1 tracking-wide">
                    Como enviar seus cliques:
                  </p>
                  <div className="text-[9.5px] text-zinc-600 space-y-1 text-left max-w-[280px] mx-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#FF6600] text-white font-bold w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] flex-shrink-0">1</span>
                      <span>Aponte a câmera do celular para o QR Code</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#FF6600] text-white font-bold w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] flex-shrink-0">2</span>
                      <span>Selecione até 3 fotos especiais da festa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#FF6600] text-white font-bold w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] flex-shrink-0">3</span>
                      <span>Envie direto para o álbum da festa!</span>
                    </div>
                  </div>
                </div>

                {/* Moldura do QR Code */}
                <div className="w-[145px] h-[145px] mx-auto bg-white border-2 border-[#FF6600] rounded-xl p-1.5 flex items-center justify-center shadow-sm">
                  {qrCodeImage ? (
                    <img src={qrCodeImage} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <Loader2 className="animate-spin text-[#FF6600]" size={24} />
                  )}
                </div>

                {/* Keep Calm & Hashtag */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-800 tracking-wide">
                    Keep Calm e Poste Sem Moderação:
                  </p>
                  <p className="text-sm font-black text-[#FF6600] tracking-wider mt-0.5">
                    #NoClickCalm
                  </p>
                </div>

                {/* Rodapé Discreto */}
                <div className="border-t border-zinc-200 pt-1 text-[8px] text-zinc-400 uppercase tracking-widest">
                  FotCabine • Lembranças Digitais do Evento
                </div>
              </div>
            </div>

            {/* Ações de Download e Cópia */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={downloadPdfA4}
                disabled={generatingPdf}
                className="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-[#FF6600]/25 cursor-pointer disabled:opacity-50"
              >
                {generatingPdf ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    Baixar Arte em PDF (A4)
                  </>
                )}
              </button>

              <button
                onClick={() => copyToClipboard(qrModalUrl)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-4 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUrl === qrModalUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedUrl === qrModalUrl ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EVENTO */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <Edit2 size={18} className="text-[#FF6600]" /> Editar Evento
              </h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Título do Evento</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Data do Evento</label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Trocar Arte de Fundo / Marca de Água</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditBgImage(e.target.files ? e.target.files[0] : null)}
                className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
              />
              {editingEvent.bg_image_url && !editBgImage && (
                <p className="text-[11px] text-zinc-500 mt-1">Deixe em branco para manter a imagem atual.</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MODERAÇÃO DE FOTOS */}
      {managingPhotosEvent && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Fotos: {managingPhotosEvent.title}</h3>
                <p className="text-xs text-zinc-400">Total: {eventPhotos.length} fotografias enviadas</p>
              </div>
              <button onClick={() => setManagingPhotosEvent(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingPhotos ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-[#FF6600]" size={32} />
                </div>
              ) : eventPhotos.length === 0 ? (
                <p className="text-center text-zinc-500 py-12 text-sm">
                  Nenhuma fotografia enviada para este evento até ao momento.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {eventPhotos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square bg-black rounded-xl overflow-hidden border border-zinc-800">
                      <img
                        src={photo.image_url}
                        alt="Fotografia enviada"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                        <span className="text-[10px] text-zinc-300 truncate">
                          Por: {photo.guest_name || 'Convidado'}
                        </span>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition shadow-lg cursor-pointer"
                        >
                          <Trash2 size={13} /> Eliminar Foto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-3 flex justify-end">
              <button
                onClick={() => setManagingPhotosEvent(null)}
                className="bg-[#FF6600] hover:bg-[#E65C00] text-white px-6 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
