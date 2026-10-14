import UploadClient from './UploadClient';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function UploadPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams?.slug || '').trim().toLowerCase();
  return <UploadClient slug={slug} />;
}
