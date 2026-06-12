import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Descargá la App — PadelMGT',
  description:
    'Instalá PadelMGT en tu iPhone, Android o tablet en 3 pasos. Torneos, juegos rápidos y tu ranking, directo desde la pantalla de inicio.',
  openGraph: {
    title: 'PadelMGT — La app de pádel en tu bolsillo',
    description:
      'Torneos, juegos rápidos y rankings. Instalala gratis en tu celular en 3 pasos.',
    url: 'https://padelmgt.com/app',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
