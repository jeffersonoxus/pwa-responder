// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas credenciais do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Erro: Variáveis de ambiente do Supabase não configuradas!');
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'responder-acoes-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Tipos para as tabelas do Supabase
export interface Perfil {
  id: string;
  nome: string;
  email: string;
  created_at?: string;
}

export interface Setor {
  id: string;
  nome: string;
  pessoas: string[];
  created_at?: string;
}

export interface Acao {
  id: string;
  nome: string;
  descricao?: string;
  local?: string;
  data_inicio?: string;
  data_fim?: string;
  status: string;
  setor_id?: string;
  tipo_acao_id?: string;
  pessoas?: string[];
  necessita_transporte?: boolean;
  observacoes?: string;
  dados_extras?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface TipoAcao {
  id: string;
  nome: string;
  parametros_extras: Array<{
    id: string;
    label: string;
    tipo: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
    opcoes?: string[];
  }>;
}