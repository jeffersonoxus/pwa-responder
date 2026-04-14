// app/responder/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAcaoOffline, salvarRespostaOffline, RespostaOffline, getUsuarioOffline, AcaoOffline, ParametroExtra } from '@/lib/db';
import { isOnline } from '@/lib/sync';
import { Calendar, MapPin, Truck, Users, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, Send, ArrowLeft, Home, WifiOff } from 'lucide-react';

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
            <label className="block text-sm font-semibold text-gray-700 mb-2">{param.label}</label>
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
              className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">{param.label}</label>
            <div className="space-y-2">
              {param.opcoes?.map(op => (
                <label key={op} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
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
                    className="w-5 h-5 rounded border-gray-300 text-purple-500"
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
      const acaoAtualizada = { ...acao, status: statusSelecionado };
      const { salvarAcoesOffline } = await import('@/lib/db');
      await salvarAcoesOffline([acaoAtualizada]);
    }
    
    router.push(`/responder/sucesso?acao=${encodeURIComponent(acao?.nome || '')}&status=${statusSelecionado}&offline=${!online}`);
  };

  const steps = [
    { title: 'Informações', icon: Calendar },
    { title: 'Perguntas', icon: CheckCircle },
    { title: 'Status', icon: Send }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !acao) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error || 'Ação não encontrada'}</p>
          <button onClick={() => router.push('/acoes')} className="bg-purple-600 text-white px-6 py-3 rounded-xl">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800">Responder Ação</h1>
              <p className="text-xs text-gray-500">Preencha as informações</p>
            </div>
          </div>
          <button onClick={() => router.push('/acoes')} className="p-2 hover:bg-gray-100 rounded-full">
            <Home size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* Status offline */}
        {!online && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
            <WifiOff size={14} />
            Modo offline - Resposta será salva localmente
          </div>
        )}
      </div>
      
      {/* Steps */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <div key={index} className="flex-1 flex items-center gap-2">
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
      
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Step 0: Informações */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{acao.nome}</h2>
              {acao.descricao && <p className="text-gray-600 mb-4">{acao.descricao}</p>}
              
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
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{pessoa}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button onClick={() => setCurrentStep(1)} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold">
              Continuar
            </button>
          </div>
        )}
        
        {/* Step 1: Perguntas */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Informações da Visita</h2>
              <p className="text-gray-500 text-sm mb-6">Responda as perguntas abaixo</p>
              
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
              <button onClick={() => setCurrentStep(0)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-medium">
                Voltar
              </button>
              <button onClick={() => setCurrentStep(2)} className="flex-1 bg-purple-600 text-white py-4 rounded-xl font-bold">
                Próximo
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Status */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Resultado da Ação</h2>
              <p className="text-gray-500 text-sm mb-6">Selecione o status final</p>
              
              <div className="space-y-3 mb-6">
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
              <button onClick={() => setCurrentStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-medium">
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!statusSelecionado || submitting}
                className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
  );
}