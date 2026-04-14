// app/layout.tsx - adicionar registro do SW
'use client';

import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado:', registration);
        })
        .catch(error => {
          console.log('Falha no registro do SW:', error);
        });
    }

    // Detectar se pode instalar
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      console.log('App pode ser instalado!');
      // Guardar o evento para usar depois
      (window as any).deferredPrompt = e;
    });
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ações" />
        <meta name="theme-color" content="#7C3AED" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        {children}
        
        {/* Botão de instalação para navegadores que suportam */}
        <script dangerouslySetInnerHTML={{
          __html: `
            let deferredPrompt;
            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault();
              deferredPrompt = e;
              console.log('App instalável detectado');
            });
          `
        }} />
      </body>
    </html>
  );
}