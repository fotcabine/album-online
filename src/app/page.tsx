'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle
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

  // Gestão / Eliminação de fotos
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
      alert('Palavra-passe incorreta.');
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
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
    if (!confirm(`Tem a certeza de que pretende eliminar o evento "${eventTitle}" e todas as suas fotografias?`)) return;
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
    if (!confirm('Deseja eliminar esta fotografia do álbum?')) return;
    try {
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err: any) {
      alert('Erro ao eliminar fotografia: ' + err.message);
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
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
        <form onSubmit={handleLogin} className="max-w-xs w-full bg-zinc-900 border border-white/10 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <Key className="mx-auto text-zinc-400" size={32} />
          <h2 className="text-xl font-medium">Painel FotCabine</h2>
          <p className="text-xs text-zinc-500">Acesso restrito à administração</p>
          <input
            type="password"
            placeholder="Palavra-passe"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-black/60 border border-white/15 px-4 py-2.5 rounded-xl text-center tracking-widest text-white text-lg focus:outline-none focus:border-white/40"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer"
          >
            Aceder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif">Gerenciador de Eventos</h1>
            <p className="text-xs text-zinc-400 mt-1">albumonline.fotcabine.com.br</p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs text-zinc-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            Terminar Sessão
          </button>
        </div>

        {/* Cadastro de Novo Evento */}
        <form onSubmit={handleCreateEvent} className="bg-zinc-900/60 border border-white/10 p-6 md:p-8 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Plus size={20} /> Cadastrar Novo Evento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Título do Evento</label>
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
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Identificador (Slug do Link)</label>
              <input
                type="text"
                required
                placeholder="ex: casamento-ana-leo"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Data do Evento</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Arte de Fundo / Marca de Água (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBgImage(e.target.files ? e.target.files[0] : null)}
              className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black font-medium px-6 py-2.5 rounded-xl hover:bg-zinc-200 transition text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'A criar evento...' : 'Criar Evento'}
          </button>
        </form>

        {/* Lista de Eventos Ativos */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Eventos Ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((evt) => {
              const albumUrl = `https://albumonline.fotcabine.com.br/e/${evt.slug}`;
              const uploadUrl = `https://albumonline.fotcabine.com.br/e/${evt.slug}/upload`;

              return (
                <div key={evt.id} className="bg-zinc-900/60 border border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-lg">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{evt.title}</h3>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 font-mono">
                          <Calendar size={13} /> {evt.event_date}
                        </p>
                      </div>

                      {/* Botões de Ação do Evento */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(evt)}
                          title="Editar Nome, Data ou Fundo"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          title="Eliminar Evento Completo"
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Exibição se tem fundo configurado */}
                    {evt.bg_image_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                        <ImageIcon size={13} className="text-zinc-500" />
                        <span>Fundo personalizado ativo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    {/* Botão para Gerir Fotografias Indevidas */}
                    <button
                      onClick={() => openManagePhotos(evt)}
                      className="w-full text-xs font-medium py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition flex items-center justify-center gap-2 border border-white/5"
                    >
                      <ImageIcon size={14} /> Moderar / Eliminar Fotos Deste Álbum
                    </button>

                    {/* Link do Álbum */}
                    <div className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-zinc-400">Álbum:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(albumUrl)}
                          className="hover:text-white text-zinc-400 transition"
                          title="Copiar Link do Álbum"
                        >
                          {copiedUrl === albumUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a href={albumUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                          Abrir <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                    {/* Link do Upload */}
                    <div className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-zinc-400">Upload Convidados:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(uploadUrl)}
                          className="hover:text-white text-zinc-400 transition"
                          title="Copiar Link de Upload"
                        >
                          {copiedUrl === uploadUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => openQrModal(evt.slug)}
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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

      </div>

      {/* MODAL: EDITAR EVENTO (Título, Data, Background) */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEdit} className="bg-zinc-900 border border-white/15 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Edit2 size={18} /> Editar Evento
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
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Data do Evento</label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Trocar Arte de Fundo / Marca de Água</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditBgImage(e.target.files ? e.target.files[0] : null)}
                className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />
              {editingEvent.bg_image_url && !editBgImage && (
                <p className="text-[11px] text-zinc-500 mt-1">Deixe em branco para manter a imagem atual.</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 bg-white text-black py-2.5 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {savingEdit ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GERIR / ELIMINAR FOTOS DO ÁLBUM */}
      {managingPhotosEvent && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/15 p-6 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Fotos: {managingPhotosEvent.title}</h3>
                <p className="text-xs text-zinc-400">Elimine fotografias indevidas ou inadequadas</p>
              </div>
              <button onClick={() => setManagingPhotosEvent(null)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingPhotos ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-zinc-400" size={32} />
                </div>
              ) : eventPhotos.length === 0 ? (
                <p className="text-center text-zinc-500 py-12 text-sm font-light">
                  Ainda não existem fotografias enviadas para este evento.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {eventPhotos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square bg-zinc-950 rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={photo.image_url}
                        alt="Fotografia enviada"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                        <span className="text-[10px] text-zinc-300 truncate">
                          Por: {photo.guest_name || 'Convidado'}
                        </span>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition shadow-lg"
                        >
                          <Trash2 size={13} /> Eliminar Foto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-3 flex justify-end">
              <button
                onClick={() => setManagingPhotosEvent(null)}
                className="bg-white text-black px-5 py-2 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QR CODE */}
      {qrModalUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/20 p-6 rounded-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-semibold">QR Code do Evento</h3>
            <p className="text-xs text-zinc-400">Digitalize para enviar fotos diretamente para este álbum</p>
            {qrCodeImage && (
              <img src={qrCodeImage} alt="QR Code" className="mx-auto rounded-xl p-2 bg-white" />
            )}
            <input
              type="text"
              readOnly
              value={qrModalUrl}
              className="w-full bg-black/50 border border-white/10 text-xs p-2.5 rounded-xl text-center text-zinc-300 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(qrModalUrl)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs transition"
              >
                {copiedUrl === qrModalUrl ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => setQrModalUrl(null)}
                className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition"
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
