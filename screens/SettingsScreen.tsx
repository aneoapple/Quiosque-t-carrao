
import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../supabaseClient';
import { Home, Plus, Edit2, Trash2, Shield, Eye, EyeOff, Save, X, Lock, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { User } from '../types';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { 
    appUsers, addAppUser, updateAppUser, deleteAppUser, 
    currentUser, changePassword, syncProductsWithSupabase 
  } = useStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  // Estados para alteração de senha
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Redireciona se não for admin
  if (currentUser?.role !== 'admin') {
      return <div className="p-8 text-center text-slate-500">Acesso negado.</div>;
  }

  const handleSaveUser = async () => {
      if (!editingUser.username || !editingUser.role) {
          alert("Preencha usuário e função.");
          return;
      }
      if (!editingUser.id && !editingUser.password) {
          alert("Senha é obrigatória para novos usuários.");
          return;
      }

      if (editingUser.id) {
          await updateAppUser(editingUser as User & { password?: string });
      } else {
          await addAppUser(editingUser as Omit<User, 'id'>);
      }
      setIsModalOpen(false);
      setEditingUser({});
      setShowPassword(false);
  };

  const handleDeleteUser = async (id: string) => {
      if (id === currentUser.id) {
          alert("Você não pode excluir seu próprio usuário.");
          return;
      }
      if (confirm("Tem certeza que deseja excluir este usuário?")) {
          await deleteAppUser(id);
      }
  };

  const handleChangePassword = async () => {
      if (!newPass || newPass !== confirmPass) {
          alert("A nova senha e a confirmação não conferem.");
          return;
      }
      if (!currentPass) {
          alert("Digite sua senha atual.");
          return;
      }
      
      await changePassword(currentUser.id, newPass);
      alert("Senha alterada com sucesso!");
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
  };

  const handleSync = async () => {
      if(confirm("Deseja sincronizar produtos em memória com o banco de dados? Isso enviará itens criados localmente que falharam ao salvar.")) {
          await syncProductsWithSupabase();
          alert("Sincronização concluída.");
      }
  }

  const handleTestConnection = async () => {
      try {
          const start = performance.now();
          // Tenta buscar apenas 1 registro leve para testar a conexão
          const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
          const end = performance.now();
          
          if (error) throw error;
          
          alert(`✅ Conexão Bem-Sucedida!\n\nTempo de resposta: ${(end - start).toFixed(0)}ms\nO banco de dados está online.`);
      } catch (error: any) {
          console.error(error);
          alert(`❌ Falha na Conexão.\n\nErro: ${error.message || 'Desconhecido'}\n\nPossíveis causas:\n1. Projeto Supabase pausado (verifique o painel do Supabase).\n2. Sem internet.\n3. Configuração de chave API inválida.`);
      }
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">
      
      {/* HEADER CINZA PASTEL */}
      <div className="bg-slate-200 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-center h-28">
        <button
          type="button"
          className="absolute left-6 w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-slate-700 shadow-sm hover:bg-white active:scale-95 transition-all"
          onClick={onBack}
        >
          <Home size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight text-center">
          Configurações
        </h1>
      </div>

      {/* CONTEÚDO */}
      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-24 max-w-4xl mx-auto w-full space-y-8">
        
        {/* SEÇÃO MANUTENÇÃO */}
        <section className="bg-orange-50 border border-orange-100 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2 mb-4">
                <AlertCircle size={20} /> Manutenção e Diagnóstico
            </h2>
            <div className="space-y-3">
                <button 
                    onClick={handleSync}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-all flex justify-center gap-2 items-center"
                >
                    <RefreshCw size={20} /> Sincronizar Produtos com Supabase
                </button>
                <button 
                    onClick={handleTestConnection}
                    className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-all flex justify-center gap-2 items-center"
                >
                    <Activity size={20} /> Testar Conexão (Ping Banco)
                </button>
            </div>
            <p className="text-xs text-orange-700 mt-4 text-center">
                Use "Sincronizar" para garantir que dados locais vão para a nuvem.<br/>
                Use "Testar Conexão" para verificar se o banco Supabase está ativo.
            </p>
        </section>

        {/* SEÇÃO A: USUÁRIOS DO PAINEL */}
        <section>
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield size={24} className="text-slate-500" /> Usuários do Painel
                </h2>
                <button 
                    onClick={() => { setEditingUser({ role: 'venda' }); setIsModalOpen(true); }}
                    className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform text-sm"
                >
                    <Plus size={18} /> Novo Usuário
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {appUsers.map(user => (
                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {user.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{user.username}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { setEditingUser({...user, password: ''}); setIsModalOpen(true); }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* SEÇÃO B: ALTERAR MINHA SENHA */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Lock size={24} className="text-slate-500" /> Alterar Minha Senha
            </h2>
            
            <div className="space-y-4 max-w-md">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Nova Senha</label>
                    <input 
                        type="password"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="••••••••"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Confirmar Nova Senha</label>
                    <input 
                        type="password"
                        value={confirmPass}
                        onChange={e => setConfirmPass(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="••••••••"
                    />
                </div>
                
                <button 
                    onClick={handleChangePassword}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex justify-center gap-2 items-center"
                >
                    <Save size={18} /> Atualizar Senha
                </button>
            </div>
        </section>

        <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 text-xs text-yellow-800 text-center">
            <strong>Nota de Segurança:</strong> As senhas são de uso interno. Mantenha o acesso Admin restrito.
        </div>

      </main>

      {/* MODAL USUÁRIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <X size={20}/>
                </button>
                
                <h2 className="text-xl font-black text-center text-slate-800 mb-6">
                    {editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Usuário (Login)</label>
                        <input 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-400"
                            value={editingUser.username || ''}
                            onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                            placeholder="Ex: joao.caixa"
                            readOnly={!!editingUser.id} // Trava edição de username se já existe
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Função (Permissão)</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-400"
                            value={editingUser.role || 'venda'}
                            onChange={e => setEditingUser({...editingUser, role: e.target.value as 'admin' | 'venda'})}
                        >
                            <option value="venda">Venda (Apenas PDV)</option>
                            <option value="admin">Admin (Acesso Total)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">
                            {editingUser.id ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                        </label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-400 pr-10"
                                value={editingUser.password || ''}
                                onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                placeholder={editingUser.id ? "********" : "Senha de acesso"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveUser}
                        className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg mt-2 active:scale-95 transition-transform flex justify-center gap-2 items-center"
                    >
                        <Save size={18} /> Salvar Usuário
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default SettingsScreen;
