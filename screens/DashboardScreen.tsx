
import React, { useMemo, useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import {
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  Package,
  Wallet,
  Users,
  LogOut,
  Settings,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  Filter
} from 'lucide-react';
import { PaymentMethod } from '../types';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

const DashboardScreen: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { sales, products, getProductStock, shifts, currentUser, logout } = useStore();
  const [filterPayment, setFilterPayment] = useState<string>('ALL');

  const isAdmin = currentUser?.role === 'admin';

  const today = new Date().toISOString().split('T')[0];

  // Filtered Sales Logic
  const todaysSales = useMemo(() => {
    return sales.filter(s => {
      const isToday = s.sale_datetime && s.sale_datetime.startsWith(today);
      const isActive = !s.canceled;

      let matchesFilter = true;
      if (filterPayment !== 'ALL') {
        if (filterPayment === 'CONSUMO_INTERNO') {
          matchesFilter = s.origin === 'funcionario' || s.payment_method === PaymentMethod.FUNCIONARIO;
        } else {
          matchesFilter = s.payment_method === filterPayment;
        }
      }

      return isToday && isActive && matchesFilter;
    });
  }, [sales, today, filterPayment]);

  // Basic KPIs
  const dailyRevenue = todaysSales.reduce((acc, curr) => acc + curr.net_value, 0);
  const dailyTicket = todaysSales.length > 0 ? dailyRevenue / todaysSales.length : 0;
  const lowStockCount = products.filter(p => {
    const stock = getProductStock(p.id);
    return stock <= p.min_stock;
  }).length;

  const scheduledEmployeesCount = (shifts || []).filter(s =>
    s.shift_date === today &&
    s.status !== 'Folga'
  ).length;

  // Breakdown KPIs (Using origin and payment_method)
  const breakdown = useMemo(() => {
    const credit = todaysSales.filter(s => s.payment_method === PaymentMethod.CREDITO).reduce((acc, s) => acc + s.net_value, 0);
    const debit = todaysSales.filter(s => s.payment_method === PaymentMethod.DEBITO).reduce((acc, s) => acc + s.net_value, 0);
    const pix = todaysSales.filter(s => s.payment_method === PaymentMethod.PIX).reduce((acc, s) => acc + s.net_value, 0);
    const cash = todaysSales.filter(s => s.payment_method === PaymentMethod.DINHEIRO).reduce((acc, s) => acc + s.net_value, 0);
    const ticket = todaysSales.filter(s => s.payment_method === PaymentMethod.VR).reduce((acc, s) => acc + s.net_value, 0);

    // Employee Consumption (based on origin = 'funcionario' OR method = 'Funcionário')
    const employeeConsumption = todaysSales
      .filter(s => s.origin === 'funcionario' || s.payment_method === PaymentMethod.FUNCIONARIO)
      .reduce((acc, s) => acc + s.net_value, 0);

    return { credit, debit, pix, cash, ticket, employeeConsumption };
  }, [todaysSales]);

  const MenuButton: React.FC<{ title: string; icon: React.ReactNode; color: string; target: string }> = ({ title, icon, color, target }) => (
    <button
      onClick={() => onNavigate(target)}
      className={`${color} text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-lg transform transition-all hover:scale-105 active:scale-95 h-32 md:h-40 w-full`}
    >
      <div className="bg-white/20 p-3 rounded-full">
        {icon}
      </div>
      <span className="font-bold text-sm md:text-lg text-center leading-tight">{title}</span>
    </button>
  );

  const filterOptions = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Dinheiro', value: PaymentMethod.DINHEIRO },
    { label: 'Pix', value: PaymentMethod.PIX },
    { label: 'Débito', value: PaymentMethod.DEBITO },
    { label: 'Crédito', value: PaymentMethod.CREDITO },
    { label: 'VR', value: PaymentMethod.VR },
    { label: 'Consumo', value: 'CONSUMO_INTERNO' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER ROSA - HOME */}
      <div className="bg-pink-100 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-2 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-between h-28 px-8">
        <div className="bg-white rounded-full p-2 w-16 h-16 flex items-center justify-center shadow-sm">
          <img
            src="https://i.imgur.com/7TCT9dy.png"
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
        </div>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black text-pink-900 tracking-tighter leading-none mb-1">
            Quiosque T. Carrão
          </h1>
          <p className="text-xs font-bold text-pink-700 uppercase tracking-widest opacity-70">
            Olá, {currentUser?.username}
          </p>
        </div>

        <button
          onClick={logout}
          className="w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-pink-900 hover:bg-white transition-colors shadow-sm active:scale-95"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* 1. SEÇÃO ACESSO RÁPIDO (TOPO) */}
      <h2 className="text-xl font-bold text-slate-800 px-2 border-l-4 border-orange-500">Acesso Rápido</h2>

      {isAdmin ? (
        // MENU ADMIN (COMPLETO)
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
          <MenuButton title="Vender Agora" target="pos" color="bg-orange-500" icon={<ShoppingBag size={32} />} />
          <MenuButton title="Estoque" target="inventory" color="bg-emerald-500" icon={<Package size={32} />} />
          <MenuButton title="Financeiro" target="finance" color="bg-blue-500" icon={<Wallet size={32} />} />
          <MenuButton title="Indicadores" target="kpi" color="bg-indigo-500" icon={<TrendingUp size={32} />} />
          <MenuButton title="Gestão Equipe" target="employees" color="bg-pink-500" icon={<Users size={32} />} />
          <MenuButton title="Configurações" target="settings" color="bg-slate-600" icon={<Settings size={32} />} />
        </div>
      ) : (
        // MENU VENDA (REDUZIDO)
        <div className="flex flex-col items-center justify-center py-4 animate-fade-in">
          <div className="w-full max-w-sm">
            <MenuButton title="Vender Agora" target="pos" color="bg-orange-500" icon={<ShoppingBag size={48} />} />
          </div>
          <p className="mt-4 text-slate-400 text-sm">Acesso restrito a vendas.</p>
        </div>
      )}

      {/* 2. SEÇÃO KPIs (ABAIXO) - APENAS PARA ADMIN */}
      {isAdmin && (
        <>
          <div className="flex items-center justify-between mt-8 mb-2">
            <h2 className="text-xl font-bold text-slate-800 px-2 border-l-4 border-indigo-500">Visão Geral do Dia</h2>
            <div className="text-slate-400 flex items-center gap-1 text-xs font-bold uppercase">
              <Filter size={14} /> Filtrar
            </div>
          </div>

          {/* BARRA DE FILTRO */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2 -mx-2 px-2">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterPayment(opt.value)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all ${filterPayment === opt.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-500 border border-slate-200'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 col-span-2">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <DollarSign size={20} />
                <span className="font-medium text-sm">Faturamento {filterPayment !== 'ALL' && '(Filtro)'}</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">R$ {dailyRevenue.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <ShoppingBag size={20} />
                <span className="font-medium text-sm">Qtd Vendas</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{todaysSales.length}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <TrendingUp size={20} />
                <span className="font-medium text-sm">Ticket Médio</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">R$ {dailyTicket.toFixed(2)}</p>
            </div>
          </div>

          {/* BREAKDOWN POR MEIO DE PAGAMENTO */}
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">Por Forma de Pagamento (Valores do Filtro)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={`bg-white p-3 rounded-xl border border-slate-100 ${breakdown.credit > 0 ? 'opacity-100' : 'opacity-50'}`}>
              <p className="text-xs font-bold text-indigo-500 flex items-center gap-1 mb-1"><CreditCard size={14} /> Crédito</p>
              <p className="font-bold text-slate-800">R$ {breakdown.credit.toFixed(2)}</p>
            </div>
            <div className={`bg-white p-3 rounded-xl border border-slate-100 ${breakdown.debit > 0 ? 'opacity-100' : 'opacity-50'}`}>
              <p className="text-xs font-bold text-blue-500 flex items-center gap-1 mb-1"><CreditCard size={14} /> Débito</p>
              <p className="font-bold text-slate-800">R$ {breakdown.debit.toFixed(2)}</p>
            </div>
            <div className={`bg-white p-3 rounded-xl border border-slate-100 ${breakdown.pix > 0 ? 'opacity-100' : 'opacity-50'}`}>
              <p className="text-xs font-bold text-teal-500 flex items-center gap-1 mb-1"><QrCode size={14} /> PIX</p>
              <p className="font-bold text-slate-800">R$ {breakdown.pix.toFixed(2)}</p>
            </div>
            <div className={`bg-white p-3 rounded-xl border border-slate-100 ${breakdown.cash > 0 ? 'opacity-100' : 'opacity-50'}`}>
              <p className="text-xs font-bold text-green-600 flex items-center gap-1 mb-1"><Banknote size={14} /> Dinheiro</p>
              <p className="font-bold text-slate-800">R$ {breakdown.cash.toFixed(2)}</p>
            </div>
            <div className={`bg-white p-3 rounded-xl border border-slate-100 ${breakdown.employeeConsumption > 0 ? 'opacity-100' : 'opacity-50'}`}>
              <p className="text-xs font-bold text-pink-500 flex items-center gap-1 mb-1"><Tag size={14} /> Consumo Interno</p>
              <p className="font-bold text-slate-800">R$ {breakdown.employeeConsumption.toFixed(2)}</p>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default DashboardScreen;
