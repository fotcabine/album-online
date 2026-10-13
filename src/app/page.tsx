'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Search, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [eventCode, setEventCode] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = eventCode.trim().toLowerCase().replace(/\s+/g, '-');
    if (cleanSlug) {
      router.push(`/e/${cleanSlug}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Background Decorativo */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
            <Camera className="text-white" size={20} />
          </div>
          <span className="font-semibold tracking-wider text-sm uppercase">FotCabine Álbuns</span>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ShieldCheck size={15} /> Painel Admin
        </Link>
      </header>

      {/* Hero / Acesso Rápido */}
      <main className="relative z-10 max-w-2xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-widest text-zinc-400 mb-3 font-mono">
          Galeria Digital em Tempo Real
        </span>
        <h1 className="text-4xl md:text-6xl font-serif tracking-tight text-white mb-6">
          Acesse o Álbum do seu Evento
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto mb-10 font-light">
          Insira o código ou identificador do evento fornecido pela equipe FotCabine para visualizar e descarregar as fotos.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-md space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              placeholder="Digite o código (ex: casamento-ana-leo)"
              className="w-full bg-zinc-900/90 border border-white/15 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 transition shadow-inner text-sm md:text-base"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-4 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-white/10"
          >
            Entrar no Álbum <ArrowRight size={18} />
          </button>
        </form>
      </main>

      {/* Rodapé */}
      <footer className="relative z-10 py-6 text-center text-xs text-zinc-600 border-t border-white/5">
        FotCabine © 2026 • Plataforma de Álbuns Online
      </footer>
    </div>
  );
}
