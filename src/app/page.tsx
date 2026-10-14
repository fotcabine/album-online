import Image from 'next/image';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-zinc-800">
      <header className="bg-black/90 border-b-4 border-[#FF6600] px-6 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Image
            src="/logo-fundo-preto.png"
            alt="FotCabine"
            width={130}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800/80 p-8 rounded-2xl shadow-xl space-y-3">
          <h1 className="text-xl font-semibold text-white">Álbum Digital Interativo</h1>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            O acesso às fotografias é disponibilizado através da hiperligação exclusiva do seu evento.
          </p>
          <div className="pt-2 text-[11px] text-zinc-500 font-mono">
            FotCabine Eventos
          </div>
        </div>
      </main>

      <footer className="py-5 text-xs text-zinc-600 border-t border-zinc-900 bg-black/60 text-center">
        FotCabine © 2026 • Todos os direitos reservados
      </footer>
    </div>
  );
}
