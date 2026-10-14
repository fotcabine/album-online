'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  
  // Criar evento
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [bgImage, setBgImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Modais e Estados
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Edição de evento
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editBgImage, setEditBgImage] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Gestão / Moderação de fotos
  const [managingPhotosEvent, setManagingPhotosEvent] = useState<any | null>(null);
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const ADMIN_PIN = '1234';

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
    // Busca os eventos trazendo a contagem de fotos vinculadas
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

      const { error: insertError } = await supabase.from('events').insert([
        {
          title,
          slug: cleanSlug,
          event_date: eventDate,
          bg_image_url: bgImageUrl,
        },
      ]);

      if (insertError) throw insertError;

      setTitle('');
      setSlug('');
      setEventDate('');
      setBgImage(null);
      fetchEvents();
    } catch (err: any) {
      alert('Erro ao criar evento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventTitle: string) => {
    if (!confirm(`Deseja realmente excluir o evento "${eventTitle}" e todas as fotos dele?`)) return;
    try {
      await supabase.from('photos').delete().eq('event_id', id);
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (err: any) {
      alert('Erro ao excluir evento: ' + err.message);
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
    if (!confirm('Deseja excluir esta foto indevida do álbum?')) return;
    try {
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
      fetchEvents(); // atualiza contador
    } catch (err: any) {
      alert('Erro ao excluir foto: ' + err.message);
    }
  };

  const openQrModal = async (eventSlug: string) => {
    const uploadUrl = `https://albumonline.fotcabine.com.br/e/${eventSlug}/upload`;
    setQrModalUrl(uploadUrl);
    try {
      const qrData = await QRCode.toDataURL(uploadUrl, { width: 320, margin: 2 });
      setQrCodeImage(qrData);
    } catch (err) {
      console.error(err);
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
              <p className="text-zinc-400 text-xs">Acesso administrativo</p>
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
              <h2 className="text-2xl font-bold text-white">Área ADMIN</h2>
              <p className="text-xs text-zinc-400 mt-1">Digite a senha para gerenciar os eventos.</p>
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
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <div className="h-8 w-8 rounded-lg bg-[#FF6600]/10 flex items-center justify-center">
              <Plus className="text-[#FF6600]" size={18} />
            </div>
            <h2 className="text-lg font-bold text-white">Cadastrar Novo Evento</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">Título do Evento</label>
              <input
                type="text"
                required
                placeholder="Ex: Casamento Ana & Léo"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug) {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                  }
                }}
                className="w-full bg-black border border-zinc-700 focus:border-[#FF6600] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">Identificador (Slug do Link)</label>
              <input
                type="text"
                required
                placeholder="ex: casamento-ana-leo"
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
            <label className="block text-xs uppercase font-medium text-zinc-400 mb-1.5">Arte de Fundo / Marca d'água (Opcional)</label>
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
            {loading ? 'Criando evento...' : 'Criar Evento'}
          </button>
        </form>

        {/* Lista de Eventos com Contador de Fotos */}
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
                          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          title="Excluir Evento"
                          className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
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
                      className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition flex items-center justify-center gap-2 border border-zinc-700"
                    >
                      <ImageIcon size={14} className="text-[#FF6600]" /> Moderação / Excluir Fotos ({photoCount})
                    </button>

                    <div className="flex items-center justify-between text-xs bg-black/60 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-400">Álbum:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copyToClipboard(albumUrl)}
                          className="hover:text-white text-zinc-400 transition"
                          title="Copiar Link do Álbum"
                        >
                          {copiedUrl === albumUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a
                          href={albumUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#FF6600] hover:underline flex items-center gap-1 font-medium"
                        >
                          Abrir <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-black/60 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-400">Upload Convidados:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copyToClipboard(uploadUrl)}
                          className="hover:text-white text-zinc-400 transition"
                          title="Copiar Link de Upload"
                        >
                          {copiedUrl === uploadUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => openQrModal(evt.slug)}
                          className="text-[#FF6600] hover:text-[#E65C00] flex items-center gap-1 font-medium"
                        >
                          QR Code <QrCode size={13} />
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

      {/* Modal Editar */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <Edit2 size={18} className="text-[#FF6600]" /> Editar Evento
              </h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="text-zinc-400 hover:text-white">
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
              <label className="block text-xs uppercase text-zinc-400 mb-1">Trocar Arte de Fundo / Marca d'água</label>
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
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Moderação de Fotos */}
      {managingPhotosEvent && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Fotos: {managingPhotosEvent.title}</h3>
                <p className="text-xs text-zinc-400">Total: {eventPhotos.length} fotos enviadas</p>
              </div>
              <button onClick={() => setManagingPhotosEvent(null)} className="text-zinc-400 hover:text-white">
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
                  Nenhuma foto enviada para este evento ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {eventPhotos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square bg-black rounded-xl overflow-hidden border border-zinc-800">
                      <img
                        src={photo.image_url}
                        alt="Foto enviada"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                        <span className="text-[10px] text-zinc-300 truncate">
                          Por: {photo.guest_name || 'Convidado'}
                        </span>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition shadow-lg"
                        >
                          <Trash2 size={13} /> Excluir Foto
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
                className="bg-[#FF6600] hover:bg-[#E65C00] text-white px-6 py-2 rounded-xl text-xs font-semibold transition"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrModalUrl && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">QR Code do Evento</h3>
            <p className="text-xs text-zinc-400">Convidados escaneiam para enviar fotos diretamente</p>
            {qrCodeImage && (
              <img src={qrCodeImage} alt="QR Code" className="mx-auto rounded-xl p-3 bg-white shadow" />
            )}
            <input
              type="text"
              readOnly
              value={qrModalUrl}
              className="w-full bg-black border border-zinc-800 text-xs p-2.5 rounded-xl text-center text-zinc-300 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(qrModalUrl)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-xs font-medium transition"
              >
                {copiedUrl === qrModalUrl ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => setQrModalUrl(null)}
                className="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white py-2 rounded-xl text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
