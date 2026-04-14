// app/acoes/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUsuarioOffline, getAcoesPendentesOffline, getAcoesOffline, AcaoOffline } from '@/lib/db';
import { sincronizarTudo, isOnline, registerConnectionListeners } from '@/lib/sync';
import { Calendar, MapPin, ChevronRight, CheckCircle, Clock, Wifi, WifiOff, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import SyncButton from '@/components/SyncButton';
import OfflineStatus from '@/components/OfflineStatus';

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
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-5 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Olá, {usuario?.nome}! 👋</h1>
            <p className="text-sm text-gray-500">
              {acoesPendentes.length} {acoesPendentes.length === 1 ? 'ação pendente' : 'ações pendentes'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
          >
            <LogOut size={20} />
          </button>
        </div>
        
        {/* Setores */}
        {usuario?.setores && usuario.setores.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {usuario.setores.map(setor => (
              <span key={setor.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
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
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-98 transition cursor-pointer hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{acao.nome}</h3>
                  {acao.local && (
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <MapPin size={14} />
                      {acao.local}
                    </p>
                  )}
                </div>
                <div className="bg-yellow-100 px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock size={12} className="text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-600">Pendente</span>
                </div>
              </div>
              
              {acao.data_inicio && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(acao.data_inicio).toLocaleDateString('pt-BR')}
                </p>
              )}
              
              <div className="mt-3 flex items-center justify-end text-purple-600 text-sm font-medium">
                Responder
                <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma ação pendente!</p>
            <p className="text-sm text-gray-400 mt-1">Todas as ações foram respondidas</p>
            {totalAcoes > 0 && (
              <p className="text-xs text-gray-400 mt-2">Total de ações realizadas: {totalAcoes}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Dica offline */}
      {!online && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-xs text-center py-2 px-4">
          <AlertCircle size={14} className="inline mr-1" />
          Modo offline - As respostas serão salvas e sincronizadas quando houver internet
        </div>
      )}
    </div>
  );
}