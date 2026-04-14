// components/InstallButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowButton(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('App instalado!');
      setShowButton(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed z-50 flex items-center justify-center gap-2 py-3 text-white bg-purple-600 shadow-lg bottom-4 left-4 right-4 rounded-xl"
    >
      <Download size={20} />
      Instalar App
    </button>
  );
}