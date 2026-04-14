// components/SyncButton.tsx
'use client';

import { RefreshCw } from 'lucide-react';

interface SyncButtonProps {
  onSync: () => void;
  syncing: boolean;
  online: boolean;
}

export default function SyncButton({ onSync, syncing, online }: SyncButtonProps) {
  if (!online) return null;
  
  return (
    <button
      onClick={onSync}
      disabled={syncing}
      className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition disabled:opacity-50"
    >
      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
      {syncing ? 'Sincronizando...' : 'Sincronizar'}
    </button>
  );
}