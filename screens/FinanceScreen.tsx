import React, { useMemo, useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { ChevronLeft, TrendingUp, TrendingDown, DollarSign, Home, Trash2, Search, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface FinanceScreenProps {
  onBack: () => void;
}

const FinanceScreen: React.FC<FinanceScreenProps> = ({ onBack }) => {
  const { sales, expenses, cancelSale, currentUser } = useStore();
  const [period, setPeriod] = useState('7DAYS');
  const [isManageSalesOpen, setIsManageSalesOpen] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const filteredData = useMemo(() => {
    const now = new Date();
    if (period === 'TODAY') {
        const today = now.toISOString().split('T')[0];
        const hours = Array.from({length: 24}, (_, i) => `${i}h`);
        return hours.map(h => {
             const hour = parseInt(h);
             const hourSales = sales.filter(s => {
                 if(!s.sale_datetime) return false;
                 const d = new Date(s.sale_datetime);
                 return d.toISOString().split('T')[0] === today && d.getHours() === hour && !s.canceled;
             }).reduce((a,c) => a + c.net_value, 0);
             return { name: h, Vendas: hourSales, Despesas: 0, Lucro: hourSales };
        });
    }
    
    // 7 Days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return days.map(date => {
      const daySales = sales.filter(s => s.sale_datetime && s.sale_datetime.startsWith(date) && !s.canceled).reduce((a, c) => a + c.net_value, 0);
      const dayExpenses = expenses.filter(e => e.expense_date && e.expense_date.startsWith(date) && !e.canceled).reduce((a, c) => a + c.value, 0);
      return {
        name: date.split('-')[2] + '/' + date.split('-')[1],
        Vendas: daySales,
        Despesas: dayExpenses,
        Lucro: daySales - dayExpenses
      };
    });
  }, [sales, expenses, period]);

  const totalSales = filteredData.reduce((a, c) => a + c.Vendas, 0);
  const totalExpenses = filteredData.reduce((a, c) => a + c.Despesas, 0);
  const totalProfit = totalSales - totalExpenses;

  const handleCancelSale = async (saleId: string) => {
      if (confirm('Tem certeza que deseja cancelar esta venda? O estoque será estornado.')) {
          const success = await cancelSale(saleId);
          if (success) {
              alert('Venda cancelada e estoque estornado.');
          } else {
              alert('Erro ao cancelar venda.');
          }
      }
  };

  const filteredSalesList = sales
    .filter(s => salesSearch ? (s.id.includes(salesSearch) || s.payment_method.toLowerCase().includes(salesSearch.toLowerCase())) : true)
    .slice(0, 50);

  return (
    <div className="pb-20 space-y-6">
      {/* HEADER AZUL PASTEL */}
      <div className="bg-blue-200 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-center h-28">
        <button 
            onClick={onBack} 
            className="absolute left-6 w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-blue-800 hover:bg-white transition-colors shadow-sm active:scale-95"
            title="Voltar para Home"
        >
          <Home size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-blue-900 tracking-tight text-center">
            Financeiro
        </h1>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex gap-2">
            <button onClick={() => setPeriod('TODAY')} className={`px-3 py-1 rounded-full text-xs font-bold ${period === 'TODAY' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Hoje</button>
            <button onClick={() => setPeriod('7DAYS')} className={`px-3 py-1 rounded-full text-xs font-bold ${period === '7DAYS' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>7 Dias</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-green-700 mb-2 font-bold"><TrendingUp size={20} /> Entradas</div>
          <p className="text-3xl font-bold text-green-800">R$ {totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-red-100 p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-red-700 mb-2 font-bold"><TrendingDown size={20} /> Saídas</div>
          <p className="text-3xl font-bold text-red-800">R$ {totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-blue-100 p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-blue-700 mb-2 font-bold"><DollarSign size={20} /> Resultado</div>
          <p className="text-3xl font-bold text-blue-800">R$ {totalProfit.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-80">
        <h3 className="font-bold mb-4 text-slate-700">{period === 'TODAY' ? 'Vendas por Hora' : 'Fluxo Semanal'}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData}>
            <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
            <YAxis fontSize={12} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: '12px' }} />
            <Bar dataKey="Vendas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700">Últimas Transações</h3>
            <button 
                onClick={() => setIsManageSalesOpen(true)}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
            >
                Gerenciar Vendas
            </button>
        </div>
        <div className="space-y-3">
            {sales.slice(0, 5).map(sale => (
                <div key={sale.id} className={`flex justify-between items-center py-2 border-b border-slate-50 ${sale.canceled ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-600"><TrendingUp size={16} /></div>
                        <div>
                            <p className="font-bold text-sm">
                                Venda #{sale.id.substring(0,4)} {sale.canceled && '(Cancelada)'}
                            </p>
                            <p className="text-xs text-slate-400">{new Date(sale.sale_datetime).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`font-bold ${sale.canceled ? 'text-slate-400 line-through' : 'text-green-600'}`}>
                            + R$ {sale.net_value.toFixed(2)}
                        </span>
                        {!sale.canceled && isAdmin && (
                            <button onClick={() => handleCancelSale(sale.id)} className="text-slate-300 hover:text-red-500">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MODAL GERENCIAR VENDAS */}
      {isManageSalesOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-fade-in relative h-[80vh] flex flex-col">
                <button onClick={() => setIsManageSalesOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <X size={20}/>
                </button>
                
                <h2 className="text-xl font-black text-center text-slate-800 mb-6">Gerenciar Vendas</h2>
                
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        placeholder="Buscar por ID ou Pagamento..." 
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredSalesList.map(sale => (
                        <div key={sale.id} className={`p-4 rounded-xl border ${sale.canceled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'} flex justify-between items-center`}>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">
                                    #{sale.id.substring(0,8)} <span className="font-normal text-slate-500">- {sale.payment_method}</span>
                                </p>
                                <p className="text-xs text-slate-400">
                                    {new Date(sale.sale_datetime).toLocaleString()}
                                </p>
                                {sale.canceled && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">CANCELADA</span>}
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${sale.canceled ? 'text-slate-400 line-through' : 'text-green-600'}`}>
                                    R$ {sale.net_value.toFixed(2)}
                                </p>
                                {!sale.canceled && isAdmin && (
                                    <button 
                                        onClick={() => handleCancelSale(sale.id)}
                                        className="text-xs text-red-500 font-bold hover:underline mt-1"
                                    >
                                        Cancelar
                                    </button>
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