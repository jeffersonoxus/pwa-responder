// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUsuarioOffline } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      const usuario = await getUsuarioOffline();
      if (usuario) {
        router.replace('/acoes');
      } else {
        router.replace('/login');
      }
    };
    checkLogin();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-purple-200 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
    </div>
  );
}