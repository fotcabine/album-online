'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import { Loader2, Download, Trash2, ExternalLink, QrCode as QrIcon, Image as ImageIcon, Eye, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import Link from 'next/link';

interface EventItem {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  bg_image_url: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Formulário Novo Evento
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Evento em exibição na Prévia ao Vivo
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDate, setPreviewDate] = useState('');
  const [previewBgUrl, setPreviewBgUrl] = useState('');

  // Modal QR Code
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  const [modalUrl, setModalUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadEvents = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
      
      // Se tiver eventos e nenhum estiver na prévia, seleciona o primeiro
      if (data && data.length > 0 && !previewTitle) {
        selectEventForPreview(data[0]);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao carregar lista de eventos: ' + err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Selecionar evento existente para visualizar na prévia acima
  const selectEventForPreview = (ev: EventItem) => {
    setPreviewTitle(ev.title);
    setPreviewDate(ev.event_date);
    setPreviewBgUrl(ev.bg_image_url || '');
  };

  // Quando o usuário digita nos campos de novo evento, atualiza a prévia em tempo real
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setPreviewTitle(val);
  };

  const handleDateChange = (val: string) => {
    setDate(val);
    setPreviewDate(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setBgFile(file);
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setPreviewBgUrl(localUrl);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      let bgUrl = '';

      if (bgFile) {
        const fileExt = bgFile.name.split('.').pop() || 'jpg';
        const fileName = `backgrounds/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: bgError } = await supabase.storage
          .from('event-media')
          .upload(fileName, bgFile, { contentType: bgFile.type });

        if (bgError) throw bgError;

        const { data: bgData } = supabase.storage
          .from('event-media')
          .getPublicUrl(fileName);

        bgUrl = bgData.publicUrl;
      }

      const sanitizedSlug = slug
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data: inserted, error: dbError } = await supabase
        .from('events')
        .insert({
          title,
          slug: sanitizedSlug,
          event_date: date,
          bg_image_url: bgUrl || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setTitle('');
      setSlug('');
      setDate('');
      setBgFile(null);

      await loadEvents();
      if (inserted) {
        selectEventForPreview(inserted);
        openQrModal(inserted);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro: ' + (err.message || 'Falha ao cadastrar evento.'));
    } finally {
      setCreating(false);
    }
  };

  // Abrir Modal do QR Code e desenhar diretamente no Canvas
  const openQrModal = (ev: EventItem) => {
    setModalEvent(ev);
    const uploadUrl = `${window.location.origin}/e/${ev.slug}/upload`;
    setModalUrl(uploadUrl);
    setIsModalOpen(true);

    setTimeout(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, uploadUrl, {
          width: 260,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        }, (error) => {
          if (error) console.error('Erro canvas:', error);
        });
      }
    }, 50);
  };

  const downloadQRCode = async (transparent: boolean) => {
    if (!modalUrl || !modalEvent) return;

    try {
      const dataUrl = await QRCode.toDataURL(modalUrl, {
        width: 1200,
        margin: transparent ? 1 : 2,
        color: {
          dark: '#000000',
          light: transparent ? '#00000000' : '#FFFFFF',
        },
      });

      const fileName = `${modalEvent.slug}-qrcode-${transparent ? 'sem-fundo' : 'com-fundo'}.png`;
      saveAs(dataUrl, fileName);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar QR Code.');
    }
  };

  const handleDeleteEvent = async (ev: EventItem) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja EXCLUIR o evento "${ev.title}"?\n\nTodas as fotos deste álbum serão apagadas permanentemente para liberar espaço na base.`
    );
    if (!confirmDelete) return;

    try {
      const { data: files } = await supabase.storage
        .from('event-media')
        .list(ev.id);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${ev.id}/${f.name}`);
        await supabase.storage.from('event-media').remove(filePaths);
      }

      if (ev.bg_image_url) {
        const parts = ev.bg_image_url.split('/event-media/');
        if (parts.length > 1) {
          await supabase.storage.from('event-media').remove([parts[1]]);
        }
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', ev.id);

      if (error) throw error;

      if (modalEvent?.id === ev.id) {
        setIsModalOpen(false);
      }

      await loadEvents();
      alert(`Evento "${ev.title}" excluído com sucesso!`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir evento: ' + err.message);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 relative">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Topo */}
        <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Cadastre álbuns, clique em qualquer evento para pré-visualizar e exporte QR codes para as mesas.
            </p>
          </div>
          <button
            onClick={loadEvents}
            disabled={loadingList}
            className="self-start md:self-auto text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg border border-zinc-700 transition"
          >
            {loadingList ? 'Atualizando...' : 'Atualizar Lista'}
          </button>
        </div>

        {/* Cadastro + Simulador de Pré-visualização */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Formulário */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-5">Novo Evento</h2>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">
                  Título do Evento (Ex: Casamento Ana & Felipe)
                </label>
                <input
                  required
                  placeholder="Ex: Casamento Jéssica & Gabriel"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">
                  Identificador / Slug (Ex: jessica-e-gabriel)
                </label>
                <input
                  required
                  placeholder="jessica-e-gabriel"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">
                  Data do Evento
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">
                  Foto de Fundo Personalizada (Marca D'água)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  A foto terá efeito suave de marca d'água para não poluir as imagens enviadas.
                </span>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {creating ? <Loader2 className="animate-spin" size={18} /> : 'Criar Evento & Gerar QR Code'}
              </button>
            </form>
          </div>

          {/* Pré-visualização ao Vivo */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Eye size={20} className="text-amber-400" /> Prévia ao Vivo do Contratante
                </h2>
                <span className="text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-2.5 py-0.5 rounded-full">
                  {previewTitle ? 'Exibindo: ' + previewTitle : 'Simulação'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Veja como o cabeçalho e o efeito marca d'água do evento selecionado aparecem.
              </p>

              <div className="relative rounded-xl overflow-hidden border border-zinc-700/80 aspect-[16/10] bg-zinc-950 flex flex-col justify-between p-4 shadow-inner">
                {previewBgUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-300 opacity-25 filter saturate-50 contrast-125"
                    style={{ backgroundImage: `url('${previewBgUrl}')` }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs pointer-events-none">
                    [Sem imagem de fundo cadastrada]
                  </div>
                )}

                <div className="relative z-10 text-center pt-2">
                  <h3 className="text-xl md:text-2xl font-serif text-white tracking-wide drop-shadow-md">
                    {previewTitle || 'Nome do Evento'}
                  </h3>
                  <p className="text-xs font-light text-zinc-300 tracking-widest mt-1">
                    {previewDate
                      ? new Date(previewDate + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })
                      : 'Data do Evento'}
                  </p>
                </div>

                <div className="relative z-10">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1 text-center font-medium">
                    Fotos dos Convidados sobre o fundo:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 opacity-80">
                    <div className="aspect-square bg-zinc-800/80 rounded border border-white/20 flex items-center justify-center text-[10px] text-zinc-400">Foto 1</div>
                    <div className="aspect-square bg-zinc-800/80 rounded border border-white/20 flex items-center justify-center text-[10px] text-zinc-400">Foto 2</div>
                    <div className="aspect-square bg-zinc-800/80 rounded border border-white/20 flex items-center justify-center text-[10px] text-zinc-400">Foto 3</div>
                    <div className="aspect-square bg-zinc-800/80 rounded border border-white/20 flex items-center justify-center text-[10px] text-zinc-400">Foto 4</div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mt-4 text-center">
              Dica: Clique no nome de qualquer evento na tabela abaixo para alternar a prévia acima!
            </p>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Eventos Ativos ({events.length})</h2>

          {loadingList ? (
            <div className="py-12 flex justify-center text-zinc-400">
              <Loader2 className="animate-spin mr-2" size={20} /> Carregando eventos...
            </div>
          ) : events.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">Nenhum evento cadastrado até o momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Título / Data (Clique para Prévia)</th>
                    <th className="py-3 px-4">Identificador (Slug)</th>
                    <th className="py-3 px-4">Fundo</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-800/30 transition">
                      <td
                        className="py-3 px-4 cursor-pointer group"
                        onClick={() => selectEventForPreview(ev)}
                        title="Clique para ver na prévia acima"
                      >
                        <div className="font-medium text-white group-hover:text-amber-400 transition flex items-center gap-1.5">
                          <Eye size={13} className="text-zinc-500 group-hover:text-amber-400" />
                          {ev.title}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-zinc-300">
                        {ev.slug}
                      </td>

                      <td className="py-3 px-4">
                        {ev.bg_image_url ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            <ImageIcon size={12} /> Personalizado
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Padrão</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openQrModal(ev)}
                            title="Ver e Baixar QR Code"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow transition"
                          >
                            <QrIcon size={14} /> QR Code
                          </button>

                          <Link
                            href={`/e/${encodeURIComponent(ev.slug)}`}
                            target="_blank"
                            title="Ver Álbum do Contratante"
                            className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 transition"
                          >
                            Álbum <ExternalLink size={12} />
                          </Link>

                          <Link
                            href={`/e/${encodeURIComponent(ev.slug)}/upload`}
                            target="_blank"
                            title="Ver Página dos Convidados"
                            className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 transition"
                          >
                            Upload <ExternalLink size={12} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev)}
                            title="Excluir Evento e Fotos"
                            className="inline-flex items-center gap-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs px-2.5 py-1.5 rounded-lg transition"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL POPUP DO QR CODE */}
      {isModalOpen && modalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">
              QR Code do Evento
            </h3>
            <p className="text-sm text-zinc-400 mb-5">
              {modalEvent.title}
            </p>

            <div className="bg-white p-4 rounded-xl inline-flex justify-center items-center shadow-lg mx-auto">
              <canvas ref={canvasRef} className="rounded" />
            </div>

            <p className="text-xs text-zinc-400 mt-4 break-all font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
              {modalUrl}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadQRCode(false)}
                className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs py-3 px-4 rounded-xl font-medium transition text-white shadow cursor-pointer"
              >
                <Download size={16} /> PNG (Com Fundo)
              </button>

              <button
                type="button"
                onClick={() => downloadQRCode(true)}
                className="inline-flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs py-3 px-4 rounded-xl font-medium transition text-amber-300 shadow cursor-pointer"
              >
                <Download size={16} /> PNG (Sem Fundo)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
