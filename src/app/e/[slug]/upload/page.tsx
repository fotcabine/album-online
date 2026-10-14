import { Suspense } from 'react';
import UploadClient from './UploadClient';
import { Loader2 } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
};

async function UploadContainer({ params }: Props) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();
  return <UploadClient slug={slug} />;
}

export default function UploadPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <Loader2 className="animate-spin text-[#FF6600]" size={36} />
        </div>
      }
    >
      <UploadContainer params={params} />
    </Suspense>
  );
}
