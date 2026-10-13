import React, { Suspense } from 'react';
import AlbumClient from './AlbumClient';
import { Loader2 } from 'lucide-react';

export default function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <Loader2 className="animate-spin text-zinc-400" size={32} />
        </div>
      }
    >
      <AlbumClient params={params} />
    </Suspense>
  );
}
