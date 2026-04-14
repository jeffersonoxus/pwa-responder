// app/acoes/page.tsx - Versão definitiva (sem navegação para responder)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUsuarioOffline, getAcoesPendentesOffline, getAcoesOffline, AcaoOffline, ParametroExtra, salvarRespostaOffline, RespostaOffline, salvarAcoesOffline } from '@/lib/db';
import { sincronizarTudo, isOnline, registerConnectionListeners } from '@/lib/sync';
import { Calendar, MapPin, ChevronRight, CheckCircle, Clock, Wifi, WifiOff, RefreshCw, LogOut, AlertCircle, Send, ArrowLeft, Home, X, Truck, Users } from 'lucide-react';
import SyncButton from '@/components/SyncButton';
import OfflineStatus from '@/components/OfflineStatus';
import InstallButton from '@/components/InstallButton';

const STATUS_OPCOES = [
  { value: 'Realizada', label: '✅ Realizada', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'Realizada Parcialmente', label: '⚠️ Realizada Parcialmente', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'Cancelada', label: '❌ Cancelada', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'Reagendada', label: '🔄 Reagendada', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' }
];

// Componente do formulário de responder (modal)
function ResponderModal({ acao, onClose, onSuccess }: { acao: AcaoOffline | null; onClose: () => void; onSuccess: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [statusSelecionado, setStatusSelecionado] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const online = isOnline();

  useEffect(() => {
    if (acao?.dados_extras) {
      setRespostas(acao.dados_extras);
    }
  }, [acao]);

  const renderizarCampoExtra = (param: ParametroExtra) => {
    const valor = respostas[param.label] || '';
    const atualizarValor = (novoValor: any) => {
      setRespostas(prev => ({ ...prev, [param.label]: novoValor }));
    };

    switch (param.tipo) {
      case 'text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">{param.label}</label>
            <input
              type="text"
              placeholder="Digite sua resposta..."
              value={valor}
              onChange={(e) => atualizarValor(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">{param.label}</label>
            <input
              type="number"
              placeholder="Digite um número..."
              value={valor}
              onChange={(e) => atualizarValor(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        );
      
      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-semibold text-gray-700">{param.label}</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => atualizarValor(true)}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  valor === true ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Sim ✅
              </button>
              <button
                type="button"
                onClick={() => atualizarValor(false)}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  valor === false ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Não ❌
              </button>
            </div>
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">{param.label}</label>
            <select
              value={valor}
              onChange={(e) => atualizarValor(e.target.value)}
              className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecione uma opção...</option>
              {param.opcoes?.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
        );
      
      case 'multiselect':
        const valoresSelecionados = Array.isArray(valor) ? valor : [];
        return (
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-semibold text-gray-700">{param.label}</label>
            <div className="space-y-2">
              {param.opcoes?.map(op => (
                <label key={op} className="flex items-center gap-3 p-3 cursor-pointer bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={valoresSelecionados.includes(op)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        atualizarValor([...valoresSelecionados, op]);
                      } else {
                        atualizarValor(valoresSelecionados.filter(v => v !== op));
                      }
                    }}
                    className="w-5 h-5 text-purple-500 border-gray-300 rounded"
                  />
                  <span>{op}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!statusSelecionado) {
      alert('Selecione um status para a ação');
      return;
    }
    
    setSubmitting(true);
    
    const usuario = await getUsuarioOffline();
    if (!usuario) {
      alert('Usuário não encontrado');
      setSubmitting(false);
      return;
    }
    
    if (!acao) return;
    
    const resposta: RespostaOffline = {
      id: `${acao.id}_${Date.now()}`,
      acao_id: acao.id,
      status: statusSelecionado,
      observacoes: observacoes,
      dados_extras: { ...respostas },
      responded_at: new Date().toISOString(),
      responded_by: usuario.id,
      responded_by_nome: usuario.nome,
      sincronizado: false
    };
    
    await salvarRespostaOffline(resposta);
    
    // Atualizar status local da ação
    const acaoAtualizada = { ...acao, status: statusSelecionado };
    await salvarAcoesOffline([acaoAtualizada]);
    
    setShowSuccess(true);
    setSubmitting(false);
    
    // Fechar modal e atualizar lista após 2 segundos
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  const steps = [
    { title: 'Informações', icon: Calendar },
    { title: 'Perguntas', icon: CheckCircle },
    { title: 'Status', icon: Send }
  ];

  if (!acao) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-md p-6 text-center bg-white rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            {statusSelecionado === 'Realizada' ? '✅ Ação Realizada!' :
             statusSelecionado === 'Realizada Parcialmente' ? '⚠️ Ação Realizada Parcialmente' :
             statusSelecionado === 'Cancelada' ? '❌ Ação Cancelada' :
             '🔄 Ação Reagendada'}
          </h2>
          <p className="text-gray-600">
            {!online ? 'Resposta salva localmente. Sincronize quando tiver internet.' : 'Resposta salva com sucesso!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header do Modal */}
        <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="font-bold text-gray-800">Responder Ação</h2>
              <p className="text-xs text-gray-500">Preencha as informações</p>
            </div>
          </div>
          {!online && (
            <div className="flex items-center gap-1 p-2 text-xs rounded-lg text-amber-600 bg-amber-50">
              <WifiOff size={14} />
              Offline
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <div key={index} className="flex items-center flex-1 gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                    isActive ? 'bg-purple-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <StepIcon size={16} />
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-gray-200">
                      <div className={`h-full transition-all ${index < currentStep ? 'bg-green-500 w-full' : 'w-0'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 pb-24">
          {/* Step 0: Informações... */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-2xl">
                <h2 className="mb-2 text-xl font-bold text-gray-800">{acao.nome}</h2>
                {acao.descricao && <p className="mb-4 text-gray-600">{acao.descricao}</p>}
                
                <div className="space-y-3">
                  {acao.local && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin size={20} />
                      <span>{acao.local}</span>
                    </div>
                  )}
                  {acao.data_inicio && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar size={20} />
                      <span>Início: {new Date(acao.data_inicio).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  {acao.necessita_transporte && (
                    <div className="flex items-center gap-3 text-purple-600">
                      <Truck size={20} />
                      <span className="font-medium">Necessita transporte</span>
                    </div>
                  )}
                  {acao.pessoas && acao.pessoas.length > 0 && (
                    <div className="flex items-start gap-3 text-gray-600">
                      <Users size={20} className="mt-0.5" />
                      <div>
                        <span className="font-medium">Participantes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {acao.pessoas.map((pessoa, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-gray-200 rounded-full">{pessoa}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button onClick={() => setCurrentStep(1)} className="w-full py-4 font-bold text-white bg-purple-600 rounded-xl">
                Continuar
              </button>
            </div>
          )}

          {/* Step 1: Perguntas */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-2xl">
                <h2 className="mb-2 text-xl font-bold text-gray-800">Informações da Visita</h2>
                <p className="mb-6 text-sm text-gray-500">Responda as perguntas abaixo</p>
                
                <div className="space-y-6">
                  {acao.parametros_extras?.map((param) => (
                    <div key={param.id}>{renderizarCampoExtra(param)}</div>
                  ))}
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Observações</label>
                    <textarea
                      placeholder="Registre observações importantes..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={4}
                      className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(0)} className="flex-1 py-4 font-medium text-gray-700 bg-gray-200 rounded-xl">
                  Voltar
                </button>
                <button onClick={() => setCurrentStep(2)} className="flex-1 py-4 font-bold text-white bg-purple-600 rounded-xl">
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Status */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-2xl">
                <h2 className="mb-2 text-xl font-bold text-gray-800">Resultado da Ação</h2>
                <p className="mb-6 text-sm text-gray-500">Selecione o status final</p>
                
                <div className="mb-6 space-y-3">
                  {STATUS_OPCOES.map((status) => {
                    const StatusIcon = status.icon;
                    const isSelected = statusSelecionado === status.value;
                    return (
                      <button
                        key={status.value}
                        onClick={() => setStatusSelecionado(status.value)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected ? `${status.bg} border-purple-500` : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`w-6 h-6 ${isSelected ? status.color : 'text-gray-400'}`} />
                          <div>
                            <p className={`font-bold ${isSelected ? status.color : 'text-gray-700'}`}>{status.label}</p>
                            <p className="text-xs text-gray-500">
                              {status.value === 'Realizada' && 'Ação concluída com sucesso'}
                              {status.value === 'Realizada Parcialmente' && 'Parte da ação foi realizada'}
                              {status.value === 'Cancelada' && 'Ação não foi realizada'}
                              {status.value === 'Reagendada' && 'Nova data será definida'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 font-medium text-gray-700 bg-gray-200 rounded-xl">
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!statusSelecionado || submitting}
                  className="flex items-center justify-center flex-1 gap-2 py-4 font-bold text-white bg-green-600 rounded-xl disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-b-2 border-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={20} />
                      Finalizar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Página principal de ações
export default function AcoesPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ nome: string; setores: Array<{ id: string; nome: string }> } | null>(null);
  const [acoesPendentes, setAcoesPendentes] = useState<AcaoOffline[]>([]);
  const [totalAcoes, setTotalAcoes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedAcao, setSelectedAcao] = useState<AcaoOffline | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleResponder = (acao: AcaoOffline) => {
    setSelectedAcao(acao);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAcao(null);
  };

  const handleModalSuccess = () => {
    carregarDados(); // Recarregar lista após responder
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
              onClick={() => handleResponder(acao)}
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
      
      {/* Dica offline */}
      {!online && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-2 text-xs text-center text-white bg-gray-800">
          <AlertCircle size={14} className="inline mr-1" />
          Modo offline - As respostas serão salvas e sincronizadas quando houver internet
        </div>
      )}

      {/* Modal de Responder */}
      {showModal && (
        <ResponderModal 
          acao={selectedAcao} 
          onClose={handleModalClose} 
          onSuccess={handleModalSuccess}
        />
      )}

      {}/* Botão de instalação */
      <InstallButton />
    </div>
  );
}

// Componente XCircle que estava faltando
function XCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}// versão definitiva
