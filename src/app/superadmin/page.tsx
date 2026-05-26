'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saIsLoggedIn } from '@/lib/superadmin-auth';

export default function SuperAdminRoot() {
  const router = useRouter();

  useEffect(() => {
    if (saIsLoggedIn()) {
      router.replace('/superadmin/dashboard');
    } else {
      router.replace('/superadmin/login');
    }
  }, [router]);

  return null;
}
