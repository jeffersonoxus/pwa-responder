// lib/sync.ts
import { supabase } from './supabase';
import type { Acao, TipoAcao } from './supabase';
import { 
  getRespostasNaoSincronizadas, 
  marcarRespostaSincronizada,
  getUsuarioOffline,
  salvarAcoesOffline,
  AcaoOffline,
} from './db';

// Sincronizar respostas pendentes para o servidor
export async function sincronizarRespostas(): Promise<{ success: boolean; count: number; errors: string[] }> {
  const respostasPendentes = await getRespostasNaoSincronizadas();
  const errors: string[] = [];
  let successCount = 0;
  
  for (const resposta of respostasPendentes) {
    try {
      // Atualizar a ação no servidor
      const { error } = await supabase
        .from('acoes')
        .update({
          status: resposta.status,
          dados_extras: resposta.dados_extras,
          observacoes: resposta.observacoes,
          updated_at: resposta.responded_at,
          updated_by: resposta.responded_by
        })
        .eq('id', resposta.acao_id);
      
      if (error) throw error;
      
      await marcarRespostaSincronizada(resposta.id);
      successCount++;
    } catch (error) {
      errors.push(`Erro ao sincronizar resposta ${resposta.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
  
  return { success: errors.length === 0, count: successCount, errors };
}

// Buscar ações atualizadas do servidor
export async function sincronizarAcoes(): Promise<{ success: boolean; novas: number }> {
  const usuario = await getUsuarioOffline();
  if (!usuario) return { success: false, novas: 0 };
  
  const setoresIds = usuario.setores.map(s => s.id);
  if (setoresIds.length === 0) return { success: true, novas: 0 };
  
  try {
    // Buscar ações com join no tipo_acao
    // CORREÇÃO: Removido nullsLast que não é suportado
    const { data: acoes, error } = await supabase
      .from('acoes')
      .select(`
        *,
        tipo_acao:tipo_acao_id (*)
      `)
      .in('setor_id', setoresIds)
      .order('data_inicio', { ascending: true });
    
    if (error) throw error;
    
    const acoesOffline: AcaoOffline[] = (acoes || []).map((acao: any) => {
      // Extrair parametros_extras do tipo_acao
      let parametrosExtras = [];
      if (acao.tipo_acao && Array.isArray(acao.tipo_acao.parametros_extras)) {
        parametrosExtras = acao.tipo_acao.parametros_extras;
      } else if (acao.tipo_acao && typeof acao.tipo_acao.parametros_extras === 'object') {
        parametrosExtras = Object.values(acao.tipo_acao.parametros_extras);
      }
      
      return {
        id: acao.id,
        nome: acao.nome,
        descricao: acao.descricao,
        local: acao.local,
        data_inicio: acao.data_inicio,
        data_fim: acao.data_fim,
        status: acao.status || 'Pendente',
        setor_id: acao.setor_id,
        setor_nome: usuario.setores.find(s => s.id === acao.setor_id)?.nome,
        tipo_acao_id: acao.tipo_acao_id,
        parametros_extras: parametrosExtras,
        dados_extras: acao.dados_extras || {},
        pessoas: acao.pessoas || [],
        necessita_transporte: acao.necessita_transporte || false,
        sincronizado: true,
        created_at: acao.created_at || new Date().toISOString(),
        updated_at: acao.updated_at
      };
    });
    
    await salvarAcoesOffline(acoesOffline);
    return { success: true, novas: acoesOffline.length };
  } catch (error) {
    console.error('Erro ao sincronizar ações:', error);
    return { success: false, novas: 0 };
  }
}

// Sincronização completa
export async function sincronizarTudo(): Promise<{ 
  acoesSuccess: boolean; 
  respostasSuccess: boolean; 
  acoesNovas: number;
  respostasEnviadas: number;
  errors: string[];
}> {
  const [acoesResult, respostasResult] = await Promise.all([
    sincronizarAcoes(),
    sincronizarRespostas()
  ]);
  
  return {
    acoesSuccess: acoesResult.success,
    respostasSuccess: respostasResult.success,
    acoesNovas: acoesResult.novas,
    respostasEnviadas: respostasResult.count,
    errors: respostasResult.errors
  };
}

// Verificar conexão com internet
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

// Registrar listeners de conexão
export function registerConnectionListeners(callback: (isOnline: boolean) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Chamar callback imediatamente com o estado atual
  callback(navigator.onLine);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}