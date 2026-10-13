'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, QrCode, ExternalLink, Calendar, Key, Image as ImageIcon, Check, Copy } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [bgImage, setBgImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Altere a senha mestre se desejar (Padrão: 1234)
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
            placeholder="Senha de Acesso"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-black/60 border border-white/15 px-4 py-2.5 rounded-xl text-center tracking-widest text-white text-lg focus:outline-none focus:border-white/40"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-zinc-200 transition cursor-pointer"
          >
            Acessar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif">Gerenciador de Eventos</h1>
            <p className="text-xs text-zinc-400 mt-1">albumonline.fotcabine.com.br</p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs text-zinc-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            Sair
          </button>
        </div>

        {/* Cadastro de Novo Evento */}
        <form onSubmit={handleCreateEvent} className="bg-zinc-900/60 border border-white/10 p-6 md:p-8 rounded-2xl space-y-4">
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
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-sm text-white"
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
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Data do Evento</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Arte de Fundo / Marca d'água (Opcional)</label>
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
            {loading ? 'Salvando...' : 'Criar Evento'}
          </button>
        </form>

        {/* Lista de Eventos */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Eventos Ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => {
              const albumUrl = `https://albumonline.fotcabine.com.br/e/${evt.slug}`;
              const uploadUrl = `https://albumonline.fotcabine.com.br/e/${evt.slug}/upload`;

              return (
                <div key={evt.id} className="bg-zinc-900/60 border border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{evt.title}</h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                      <Calendar size={13} /> {evt.event_date}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    {/* Link do Álbum (Para o Contratante) */}
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

                    {/* Link do QR Code / Envio (Para os Convidados) */}
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

      {/* Modal QR Code */}
      {qrModalUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/20 p-6 rounded-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-semibold">QR Code do Evento</h3>
            <p className="text-xs text-zinc-400">Escaneie para enviar fotos diretamente para este álbum</p>
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
