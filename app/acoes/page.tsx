// app/acoes/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUsuarioOffline, getAcoesPendentesOffline, getAcoesOffline, AcaoOffline } from '@/lib/db';
import { sincronizarTudo, isOnline, registerConnectionListeners } from '@/lib/sync';
import { Calendar, MapPin, ChevronRight, CheckCircle, Clock, Wifi, WifiOff, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import SyncButton from '@/components/SyncButton';
import OfflineStatus from '@/components/OfflineStatus';
import InstallButton from '@/components/InstallButton';

export default function AcoesPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ nome: string; setores: Array<{ id: string; nome: string }> } | null>(null);
  const [acoesPendentes, setAcoesPendentes] = useState<AcaoOffline[]>([]);
  const [totalAcoes, setTotalAcoes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const carregarDados = useCallback(async () => {
    const usuarioData = await getUsuarioOffline();
    if (!usuarioData) {
      router.replace('/login');
      return;
    }
    
    setUsuario(usuarioData);
    
    const pendentes = await getAcoesPendentesOffline();
    const todas = await getAcoesOffline();
    
    setAcoesPendentes(pendentes);
    setTotalAcoes(todas.length);
    setLoading(false);
  }, [router]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    
    const result = await sincronizarTudo();
    
    if (result.acoesSuccess && result.respostasSuccess) {
      setSyncMessage({ type: 'success', text: `Sincronizado! ${result.acoesNovas} ações atualizadas, ${result.respostasEnviadas} respostas enviadas.` });
      await carregarDados();
    } else {
      setSyncMessage({ type: 'error', text: 'Erro na sincronização. Tente novamente.' });
    }
    
    setTimeout(() => setSyncMessage(null), 4000);
    setSyncing(false);
  };

  const handleLogout = async () => {
    if (confirm('Deseja sair? Você precisará de internet para fazer login novamente.')) {
      localStorage.clear();
      indexedDB.deleteDatabase('responder-acoes-db');
      router.replace('/login');
    }
  };

  useEffect(() => {
    carregarDados();
    setOnline(isOnline());
    
    const unsubscribe = registerConnectionListeners((isOnlineNow) => {
      setOnline(isOnlineNow);
      if (isOnlineNow) {
        handleSync();
      }
    });
    
    return () => unsubscribe?.();
  }, [carregarDados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-50">
        <div className="w-12 h-12 border-b-2 border-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-5 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Olá, {usuario?.nome}! 👋</h1>
            <p className="text-sm text-gray-500">
              {acoesPendentes.length} {acoesPendentes.length === 1 ? 'ação pendente' : 'ações pendentes'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 transition rounded-full hover:bg-gray-100"
          >
            <LogOut size={20} />
          </button>
        </div>
        
        {/* Setores */}
        {usuario?.setores && usuario.setores.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {usuario.setores.map(setor => (
              <span key={setor.id} className="px-2 py-1 text-xs text-purple-700 bg-purple-100 rounded-full">
                🏢 {setor.nome}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Status e Sincronização */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <OfflineStatus online={online} />
          <SyncButton onSync={handleSync} syncing={syncing} online={online} />
        </div>
        {syncMessage && (
          <div className={`mt-2 text-xs p-2 rounded-lg ${syncMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {syncMessage.text}
          </div>
        )}
      </div>
      
      {/* Lista de Ações */}
      <div className="px-4 py-4 space-y-3">
        {acoesPendentes.length > 0 ? (
          acoesPendentes.map((acao) => (
            <div
              key={acao.id}
              onClick={() => router.push(`/responder/${acao.id}`)}
              className="p-4 transition bg-white border border-gray-100 shadow-sm cursor-pointer rounded-2xl active:scale-98 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{acao.nome}</h3>
                  {acao.local && (
                    <p className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <MapPin size={14} />
                      {acao.local}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
                  <Clock size={12} className="text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-600">Pendente</span>
                </div>
              </div>
              
              {acao.data_inicio && (
                <p className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <Calendar size={12} />
                  {new Date(acao.data_inicio).toLocaleDateString('pt-BR')}
                </p>
              )}
              
              <div className="flex items-center justify-end mt-3 text-sm font-medium text-purple-600">
                Responder
                <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <p className="font-medium text-gray-500">Nenhuma ação pendente!</p>
            <p className="mt-1 text-sm text-gray-400">Todas as ações foram respondidas</p>
            {totalAcoes > 0 && (
              <p className="mt-2 text-xs text-gray-400">Total de ações realizadas: {totalAcoes}</p>
            )}
          </div>
        )}
      </div>

      <InstallButton />
      
      {/* Dica offline */}
      {!online && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-2 text-xs text-center text-white bg-gray-800">
          <AlertCircle size={14} className="inline mr-1" />
          Modo offline - As respostas serão salvas e sincronizadas quando houver internet
        </div>
      )}
    </div>
  );
}