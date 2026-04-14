// lib/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface AcaoOffline {
  id: string;
  nome: string;
  descricao?: string;
  local?: string;
  data_inicio?: string;
  data_fim?: string;
  status: string;
  setor_id?: string;
  setor_nome?: string;
  tipo_acao_id?: string;
  parametros_extras?: ParametroExtra[];
  dados_extras?: Record<string, any>;
  pessoas?: string[];
  necessita_transporte?: boolean;
  sincronizado: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ParametroExtra {
  id: string;
  label: string;
  tipo: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  opcoes?: string[];
}

export interface RespostaOffline {
  id: string;
  acao_id: string;
  status: string;
  observacoes: string;
  dados_extras: Record<string, any>;
  responded_at: string;
  responded_by: string;
  responded_by_nome: string;
  sincronizado: boolean;
}

export interface UsuarioOffline {
  id: string;
  email: string;
  nome: string;
  setores: Array<{ id: string; nome: string }>;
  login_at: string;
}

interface AppDB extends DBSchema {
  usuarios: {
    key: string;
    value: UsuarioOffline;
  };
  acoes: {
    key: string;
    value: AcaoOffline;
    indexes: { 'setor_id': string; 'status': string };
  };
  respostas: {
    key: string;
    value: RespostaOffline;
    indexes: { 'acao_id': string; 'sincronizado': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>('responder-acoes-db', 1, {
      upgrade(db) {
        // Store de usuários
        if (!db.objectStoreNames.contains('usuarios')) {
          db.createObjectStore('usuarios', { keyPath: 'id' });
        }
        
        // Store de ações
        if (!db.objectStoreNames.contains('acoes')) {
          const acoesStore = db.createObjectStore('acoes', { keyPath: 'id' });
          acoesStore.createIndex('setor_id', 'setor_id');
          acoesStore.createIndex('status', 'status');
        }
        
        // Store de respostas
        if (!db.objectStoreNames.contains('respostas')) {
          const respostasStore = db.createObjectStore('respostas', { keyPath: 'id' });
          respostasStore.createIndex('acao_id', 'acao_id');
          respostasStore.createIndex('sincronizado', 'sincronizado');
        }
      },
    });
  }
  return dbPromise;
}

// Utilitários para ações
export async function salvarAcoesOffline(acoes: AcaoOffline[]) {
  const db = await getDB();
  const tx = db.transaction('acoes', 'readwrite');
  for (const acao of acoes) {
    await tx.store.put(acao);
  }
  await tx.done;
}

export async function getAcoesOffline(): Promise<AcaoOffline[]> {
  const db = await getDB();
  return db.getAll('acoes');
}

export async function getAcoesPendentesOffline(): Promise<AcaoOffline[]> {
  const db = await getDB();
  const todas = await db.getAll('acoes');
  return todas.filter(a => a.status === 'Pendente' || a.status === 'Reagendada');
}

export async function getAcaoOffline(id: string): Promise<AcaoOffline | undefined> {
  const db = await getDB();
  return db.get('acoes', id);
}

// Utilitários para respostas
export async function salvarRespostaOffline(resposta: RespostaOffline) {
  const db = await getDB();
  await db.put('respostas', resposta);
}

export async function getRespostasNaoSincronizadas(): Promise<RespostaOffline[]> {
  const db = await getDB();
  const todas = await db.getAll('respostas');
  return todas.filter(r => !r.sincronizado);
}

export async function marcarRespostaSincronizada(id: string) {
  const db = await getDB();
  const resposta = await db.get('respostas', id);
  if (resposta) {
    resposta.sincronizado = true;
    await db.put('respostas', resposta);
  }
}

// Utilitários para usuário
export async function salvarUsuarioOffline(usuario: UsuarioOffline) {
  const db = await getDB();
  await db.put('usuarios', usuario);
}

export async function getUsuarioOffline(): Promise<UsuarioOffline | undefined> {
  const db = await getDB();
  const usuarios = await db.getAll('usuarios');
  return usuarios[0];
}

export async function limparDadosOffline() {
  const db = await getDB();
  await db.clear('acoes');
  await db.clear('respostas');
}