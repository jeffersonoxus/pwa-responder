// app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Perfil, Setor } from '@/lib/supabase';
import { sincronizarAcoes } from '@/lib/sync';
import { salvarUsuarioOffline, UsuarioOffline } from '@/lib/db';
import { Loader2, Shield, Wifi, WifiOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError('É necessário estar conectado à internet para fazer login inicial.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Autenticar no Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;
      
      // Buscar perfil do usuário
      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('id, nome, email')
        .eq('email', email)
        .single();
      
      if (perfilError) throw new Error('Perfil não encontrado');
      
      // Buscar setores do usuário
      const { data: setores, error: setoresError } = await supabase
        .from('setores')
        .select('id, nome, pessoas');
      
      if (setoresError) throw setoresError;
      
      // Filtrar setores onde o usuário está no array 'pessoas'
      const setoresDoUsuario = (setores || []).filter(setor => {
        const pessoas = setor.pessoas || [];
        return pessoas.includes(perfil.id);
      });
      
      if (setoresDoUsuario.length === 0) {
        throw new Error('Usuário não está vinculado a nenhum setor');
      }
      
      // Salvar usuário offline
      const usuarioOffline: UsuarioOffline = {
        id: perfil.id,
        email: email,
        nome: perfil.nome,
        setores: setoresDoUsuario.map(s => ({ id: s.id, nome: s.nome })),
        login_at: new Date().toISOString()
      };
      
      await salvarUsuarioOffline(usuarioOffline);
      
      // Sincronizar ações
      await sincronizarAcoes();
      
      router.replace('/acoes');
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Responder Ações</h1>
          <p className="text-gray-500 mt-1">Diretoria de Ensino</p>
          
          {/* Status de conexão */}
          <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline (login não disponível)'}
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="seu@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !isOnline}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          
          <p className="text-xs text-center text-gray-400 mt-4">
            Faça login uma vez enquanto estiver online.<br />
            Depois o app funcionará offline!
          </p>
        </form>
      </div>
    </div>
  );
}