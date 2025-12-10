import React, { useMemo, useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { PaymentMethod } from '../types';
import { ChevronLeft, TrendingUp, TrendingDown, DollarSign, Home, Trash2, Search, X, CreditCard, Banknote, QrCode, Tag, Users, Trophy, ShoppingBag, Activity, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface FinanceScreenProps {
  onBack: () => void;
}

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Vibrant Palette

const FinanceScreen: React.FC<FinanceScreenProps> = ({ onBack }) => {
  const { sales, expenses, cancelSale, currentUser, products, employees } = useStore();
  const [period, setPeriod] = useState('7DAYS'); // TODAY, 7DAYS, 30DAYS
  const [isManageSalesOpen, setIsManageSalesOpen] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // --- DATA FILTERING ---
  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return sales.filter(s => {
      if (s.canceled) return false;
      const d = s.sale_datetime.split('T')[0];
      if (period === 'TODAY') return d === today;
      if (period === '7DAYS') return d >= sevenDaysAgo.toISOString().split('T')[0];
      if (period === '30DAYS') return d >= thirtyDaysAgo.toISOString().split('T')[0];
      return true;
    });
  }, [sales, period]);

  const filteredExpenses = useMemo(() => {
    // Similar filtering for expenses
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return expenses.filter(e => {
      const d = e.expense_date.split('T')[0];
      if (period === 'TODAY') return d === today;
      if (period === '7DAYS') return d >= sevenDaysAgo.toISOString().split('T')[0];
      if (period === '30DAYS') return d >= thirtyDaysAgo.toISOString().split('T')[0];
      return true;
    });
  }, [expenses, period]);

  // --- KPIs ---
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.net_value, 0);
  const totalExpensesVal = filteredExpenses.reduce((acc, e) => acc + e.value, 0);

  // Calculate COGS (Cost of Goods Sold) based on current product cost
  // Note: Historical cost is not stored in DB, so this is an approximation.
  const totalCOGS = filteredSales.reduce((acc, s) => {
    if (!(s as any).sale_items) return acc;
    const saleCost = ((s as any).sale_items as any[]).reduce((iAcc, item) => {
      const product = products.find(p => p.id === item.product_id);
      const unitCost = product ? (product.cost || 0) : 0;
      return iAcc + (unitCost * item.quantity);
    }, 0);
    return acc + saleCost;
  }, 0);

  const grossProfit = totalRevenue - totalCOGS; // Lucro Bruto (Venda - Custo Produto)
  const totalProfit = grossProfit - totalExpensesVal; // Lucro Líquido (Bruto - Despesas)

  const salesCount = filteredSales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  // --- CHARTS DATA ---

  // 1. Bar Chart: Revenue vs Expenses
  const barChartData = useMemo(() => {
    if (period === 'TODAY') {
      // Hourly
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return hours.map(h => {
        const hourSales = filteredSales.filter(s => new Date(s.sale_datetime).getHours() === h).reduce((a, c) => a + c.net_value, 0);
        return { name: `${h}h`, Vendas: hourSales, Despesas: 0 };
      });
    } else {
      // Daily
      const grouped: any = {};
      filteredSales.forEach(s => {
        const d = s.sale_datetime.split('T')[0].split('-').slice(1).reverse().join('/');
        grouped[d] = (grouped[d] || 0) + s.net_value;
      });
      return Object.keys(grouped).map(k => ({ name: k, Vendas: grouped[k], Despesas: 0 }));
    }
  }, [filteredSales, period]);

  // 2. Pie Chart: Payment Methods
  const pieChartData = useMemo(() => {
    const counts: any = {};
    filteredSales.forEach(s => {
      const method = s.payment_method || 'Outros';
      counts[method] = (counts[method] || 0) + s.net_value;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredSales]);

  // 3. Top Products
  const topProducts = useMemo(() => {
    const productStats: any = {};

    filteredSales.forEach((s: any) => {
      if (s.sale_items) {
        s.sale_items.forEach((item: any) => {
          if (!productStats[item.product_id]) {
            productStats[item.product_id] = { qty: 0, total: 0, name: 'Produto Desconhecido', image: null };
            // Find product details
            const p = products.find(prod => prod.id === item.product_id);
            if (p) {
              productStats[item.product_id].name = p.name;
              productStats[item.product_id].image = p.image_url;
            }
          }
          productStats[item.product_id].qty += item.quantity;
          productStats[item.product_id].total += item.total_value || item.total || 0;
        });
      }
    });

    return Object.values(productStats)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 5);
  }, [filteredSales, products]);

  // 4 Top Employees Consumption
  const topEmployees = useMemo(() => {
    const empStats: any = {};

    filteredSales.forEach(s => {
      if (s.employee_id) {
        if (!empStats[s.employee_id]) {
          empStats[s.employee_id] = { total: 0, count: 0, name: getEmployeeName(s.employee_id) };
        }
        empStats[s.employee_id].total += s.net_value;
        empStats[s.employee_id].count += 1;
      }
    });

    return Object.values(empStats)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 5);
  }, [filteredSales, employees]);


  // Helper for manage modal
  const handleCancelSale = async (saleId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta venda? O estoque será estornado.')) {
      const success = await cancelSale(saleId);
      if (success) alert('Venda cancelada.');
      else alert('Erro ao cancelar.');
    }
  };

  const getEmployeeName = (empId?: string) => {
    if (!empId) return null;
    return employees.find(e => e.id === empId)?.name || 'Funcionário';
  };

  const filteredSalesList = sales
    .filter(s => salesSearch ? (s.id.includes(salesSearch) || s.payment_method.toLowerCase().includes(salesSearch.toLowerCase())) : true)
    .slice(0, 50);

  return (
    <div className="pb-24 space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 -mx-4 -mt-4 md:-mx-6 md:-mt-6 rounded-b-[3rem] shadow-xl text-white relative h-40 flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        <button
          onClick={onBack}
          className="absolute left-6 top-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-all active:scale-95"
        >
          <Home size={20} className="text-white" />
        </button>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 drop-shadow-md">
          KPI Dashboard
        </h1>
        <p className="text-indigo-100 font-medium opacity-90 text-sm md:text-base">Análise Financeira e Estatísticas</p>
      </div>

      {/* FILTERS */}
      <div className="flex justify-center -mt-8 relative z-10">
        <div className="bg-white p-1.5 rounded-full shadow-lg border border-slate-100 flex gap-1">
          {['TODAY', '7DAYS', '30DAYS'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${period === p ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {p === 'TODAY' ? 'Hoje' : p === '7DAYS' ? '7 Dias' : '30 Dias'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-3xl text-white shadow-lg shadow-green-200">
          <div className="flex items-center gap-2 opacity-80 mb-1 text-xs font-bold uppercase"><DollarSign size={14} /> Faturamento</div>
          <p className="text-2xl font-black">R$ {totalRevenue.toFixed(2)}</p>
          <div className="mt-2 text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full">+ {salesCount} vendas</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-2 opacity-80 mb-1 text-xs font-bold uppercase"><DollarSign size={14} /> Lucro Líquido</div>
          <p className="text-2xl font-black">R$ {totalProfit.toFixed(2)}</p>
          <div className="mt-2 text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full">Margem calculada</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase"><ShoppingBag size={14} /> Qtd. Vendas</div>
          <p className="text-2xl font-black text-slate-800">{salesCount}</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase"><Activity size={14} /> Ticket Médio</div>
          <p className="text-2xl font-black text-slate-800">R$ {avgTicket.toFixed(2)}</p>
        </div>
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-80">
        {/* SALES CHART */}
        <div className="md:col-span-2 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500" /> Fluxo de Vendas</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="Vendas" fill="#6366f1" radius={[4, 4, 4, 4]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAYMENT PIE CHART */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CreditCard size={18} className="text-pink-500" /> Meios de Pagamento</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP PRODUCTS & EMPLOYEE CONSUMPTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TOP PRODUCTS */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Top 5 Mais Vendidos</h3>
          <div className="space-y-4">
            {topProducts.map((p: any, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs">{idx + 1}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700 truncate">{p.name || 'Produto'}</span>
                    <span className="font-bold text-slate-900">R$ {p.total.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(p.total / (topProducts[0]?.total || 1)) * 100}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.qty} unidades vendidas</div>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Sem dados de vendas.</p>}
          </div>
        </div>

        {/* TOP EMPLOYEE CONSUMPTION */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Users size={18} className="text-pink-500" /> Ranking Consumo (Funcionários)</h3>
          <div className="space-y-4">
            {topEmployees.map((e: any, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0 font-bold text-sm border-2 border-white shadow-sm">
                  {(e.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700 truncate">{e.name}</span>
                    <span className="font-bold text-slate-900">R$ {e.total.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pink-500"
                      style={{
                        width: `${(e.total / (topEmployees[0]?.total || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{e.count} compras</div>
                </div>
              </div>
            ))}
            {topEmployees.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Nenhum consumo registrado.</p>}
          </div>
        </div>
      </div>

      {/* MODAL GERENCIAR VENDAS (Legacy Support) */}
      {isManageSalesOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-slate-800">Gerenciar Vendas</h2>
              <button onClick={() => setIsManageSalesOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                placeholder="Buscar venda..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredSalesList.map(sale => (
                <div key={sale.id} className={`p-4 rounded-xl border ${sale.canceled ? 'bg-slate-50 opacity-60' : 'bg-white border-slate-100'} flex justify-between items-center`}>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">#{sale.id.substring(0, 8)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(sale.sale_datetime).toLocaleString()} • {sale.payment_method}
                      {sale.employee_id && <span className="text-pink-600 font-bold ml-1">({getEmployeeName(sale.employee_id)})</span>}
                    </p>
                    {sale.canceled && <span className="text-[10px] text-red-500 font-bold">CANCELADA</span>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">R$ {sale.net_value.toFixed(2)}</p>
                    {!sale.canceled && isAdmin && (
                      <button onClick={() => handleCancelSale(sale.id)} className="text-[10px] text-red-400 font-bold mt-1">CANCELAR</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceScreen;