// app/responder/[id]/page.tsx (versão corrigida)
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAcaoOffline, salvarRespostaOffline, RespostaOffline, getUsuarioOffline, AcaoOffline, ParametroExtra } from '@/lib/db';
import { isOnline } from '@/lib/sync';
import { Calendar, MapPin, Truck, Users, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, Send, ArrowLeft, Home, WifiOff, X } from 'lucide-react';

const STATUS_OPCOES = [
  { value: 'Realizada', label: '✅ Realizada', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'Realizada Parcialmente', label: '⚠️ Realizada Parcialmente', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'Cancelada', label: '❌ Cancelada', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'Reagendada', label: '🔄 Reagendada', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' }
];

export default function ResponderPage() {
  const params = useParams();
  const router = useRouter();
  const acaoId = params.id as string;
  
  const [acao, setAcao] = useState<AcaoOffline | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [statusSelecionado, setStatusSelecionado] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [online] = useState(isOnline());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  useEffect(() => {
    const carregarAcao = async () => {
      const acaoData = await getAcaoOffline(acaoId);
      if (!acaoData) {
        setError('Ação não encontrada');
      } else if (acaoData.status !== 'Pendente' && acaoData.status !== 'Reagendada') {
        setError('Esta ação já foi respondida');
      } else {
        setAcao(acaoData);
        if (acaoData.dados_extras) {
          setRespostas(acaoData.dados_extras);
        }
      }
      setLoading(false);
    };
    carregarAcao();
  }, [acaoId]);

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
    
    const resposta: RespostaOffline = {
      id: `${acaoId}_${Date.now()}`,
      acao_id: acaoId,
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
    if (acao) {
      const { salvarAcoesOffline } = await import('@/lib/db');
      const acaoAtualizada = { ...acao, status: statusSelecionado };
      await salvarAcoesOffline([acaoAtualizada]);
    }
    
    // Mostrar modal de sucesso em vez de redirecionar
    setSuccessMessage({
      title: statusSelecionado === 'Realizada' ? '✅ Ação Realizada!' :
              statusSelecionado === 'Realizada Parcialmente' ? '⚠️ Ação Realizada Parcialmente' :
              statusSelecionado === 'Cancelada' ? '❌ Ação Cancelada' :
              '🔄 Ação Reagendada',
      message: !online ? 'Resposta salva localmente. Sincronize quando tiver internet.' : 'Resposta salva com sucesso!'
    });
    setShowSuccessModal(true);
    setSubmitting(false);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push('/acoes');
  };

  const steps = [
    { title: 'Informações', icon: Calendar },
    { title: 'Perguntas', icon: CheckCircle },
    { title: 'Status', icon: Send }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-50">
        <div className="w-12 h-12 border-b-2 border-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !acao) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-purple-50">
        <div className="max-w-md p-8 text-center bg-white shadow-xl rounded-3xl">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Erro</h2>
          <p className="mb-4 text-gray-600">{error || 'Ação não encontrada'}</p>
          <button onClick={() => router.push('/acoes')} className="px-6 py-3 text-white bg-purple-600 rounded-xl">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800">Responder Ação</h1>
              <p className="text-xs text-gray-500">Preencha as informações</p>
            </div>
          </div>
          <button onClick={() => router.push('/acoes')} className="p-2 rounded-full hover:bg-gray-100">
            <Home size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* Status offline */}
        {!online && (
          <div className="flex items-center gap-1 p-2 mt-2 text-xs rounded-lg text-amber-600 bg-amber-50">
            <WifiOff size={14} />
            Modo offline - Resposta será salva localmente
          </div>
        )}
      </div>
      
      {/* Steps */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
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
      
      <div className="max-w-2xl px-4 py-6 pb-24 mx-auto">
        {/* Step 0: Informações */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="p-6 bg-white shadow-sm rounded-2xl">
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
                          <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded-full">{pessoa}</span>
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
            <div className="p-6 bg-white shadow-sm rounded-2xl">
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
              <button onClick={() => setCurrentStep(0)} className="flex-1 py-4 font-medium text-gray-700 bg-gray-100 rounded-xl">
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
            <div className="p-6 bg-white shadow-sm rounded-2xl">
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
                        isSelected ? `${status.bg} border-${status.color.replace('text-', '')}` : 'bg-white border-gray-200'
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
              <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 font-medium text-gray-700 bg-gray-100 rounded-xl">
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

      {/* Modal de Sucesso - sem redirecionamento! */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 text-center duration-200 bg-white rounded-2xl animate-in fade-in zoom-in">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="mb-2 text-xl font-bold text-gray-800">{successMessage.title}</h2>
            <p className="mb-6 text-gray-600">{successMessage.message}</p>
            
            {!online && (
              <div className="flex items-center justify-center gap-2 p-3 mb-6 bg-yellow-50 rounded-xl">
                <WifiOff size={18} className="text-yellow-600" />
                <p className="text-sm text-yellow-700">Resposta salva localmente. Sincronize quando tiver internet.</p>
              </div>
            )}
            
            <button
              onClick={handleCloseModal}
              className="w-full py-3 font-medium text-white transition bg-purple-600 rounded-xl hover:bg-purple-700"
            >
              Voltar para Ações
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}