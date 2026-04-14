// components/OfflineStatus.tsx
'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface OfflineStatusProps {
  online: boolean;
}

export default function OfflineStatus({ online }: OfflineStatusProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${online ? 'text-green-600' : 'text-amber-600'}`}>
      {online ? <Wifi size={16} /> : <WifiOff size={16} />}
      <span>{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}