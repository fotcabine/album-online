import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestão Restrita • FotCabine',
  robots: 'noindex, nofollow', // Evita que o Google indexe sua área secreta
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}