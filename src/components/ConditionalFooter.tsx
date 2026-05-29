'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) return null;
  if (pathname.startsWith('/superadmin')) return null;
  return <Footer />;
}
