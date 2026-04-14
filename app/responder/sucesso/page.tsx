'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Home, ArrowLeft, WifiOff } from 'lucide-react';

function SucessoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const acaoNome = searchParams.get('acao');
  const status = searchParams.get('status');
  const offline = searchParams.get('offline') === 'true';

  const getStatusMessage = () => {
    switch (status) {
      case 'Realizada': return 'Ação registrada como realizada com sucesso!';
      case 'Realizada Parcialmente': return 'Ação registrada como realizada parcialmente.';
      case 'Cancelada': return 'Ação registrada como cancelada.';
      case 'Reagendada': return 'Ação registrada como reagendada.';
      default: return 'Ação registrada com sucesso!';
    }
  };

  return (
    <div className="w-full max-w-md p-8 text-center bg-white shadow-xl rounded-3xl">
      <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Resposta Registrada!</h1>
      <p className="mb-4 text-gray-600">{getStatusMessage()}</p>
      
      {offline && (
        <div className="flex items-center justify-center gap-2 p-3 mb-6 bg-yellow-50 rounded-xl">
          <WifiOff size={18} className="text-yellow-600" />
          <p className="text-sm text-yellow-700">Resposta salva localmente. Sincronize quando tiver internet.</p>
        </div>
      )}
      
      {acaoNome && (
        <div className="p-4 mb-6 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500">Ação</p>
          <p className="font-semibold text-gray-800">{acaoNome}</p>
        </div>
      )}
      
      <div className="space-y-3">
        <button onClick={() => router.push('/acoes')} className="flex items-center justify-center w-full gap-2 py-3 font-bold text-white bg-purple-600 rounded-xl">
          <Home size={20} />
          Voltar para Ações
        </button>
      </div>
    </div>
  );
}

export default function SucessoPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-b from-green-50 to-emerald-50">
      <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
        <SucessoContent />
      </Suspense>
    </div>
  );
}