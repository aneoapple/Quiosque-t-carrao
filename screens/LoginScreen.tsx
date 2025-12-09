import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Eye, EyeOff } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Preencha usuário e senha');
      return;
    }

    const success = await login(username, password);
    if (!success) {
      setError('Usuário ou senha inválidos');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-6">
        <div className="flex justify-center mb-4">
            <img 
                src="https://i.imgur.com/7TCT9dy.png" 
                alt="Logo" 
                className="h-20 w-20 object-contain"
            />
        </div>
        <div className="text-center">
            <h1 className="text-2xl font-black text-slate-800">Quiosque T. Carrão</h1>
            <p className="text-slate-500 text-sm">Acesso ao painel interno</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Usuário</label>
                <input 
                    type="text"
                    autoComplete="off"
                    name="app_username_field"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700"
                    placeholder="Seu usuário"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        autoComplete="off"
                        name="app_password_field"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700"
                        placeholder="Sua senha"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold text-center">
                    {error}
                </div>
            )}

            <button 
                type="submit"
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform hover:bg-orange-600"
            >
                Entrar
            </button>
        </form>
      </div>
      <p className="mt-8 text-xs text-slate-400 font-medium">R3 Builder® - Sistema de Gestão</p>
    </div>
  );
};

export default LoginScreen;