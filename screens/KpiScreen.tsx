import React, { useState, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import { ChevronLeft, Filter, Trash2, ArrowDownCircle, ArrowUpCircle, Home } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface KpiScreenProps { onBack: () => void; }
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const KpiScreen: React.FC<KpiScreenProps> = ({ onBack }) => {
  const { sales, expenses, cancelSale, cancelExpense } = useStore();
  const [dateRange, setDateRange] = useState('TODAY');

  const filteredSales = useMemo(() => {
    // Simplified filtering logic for brevity, expands on previous implementation
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    return sales.filter(s => s.sale_datetime && s.sale_datetime.startsWith(today) && !s.canceled);
  }, [sales, dateRange]);

  const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.net_value, 0);
  
  const handleCancel = (id: string, type: 'SALE' | 'EXPENSE') => {
      if(confirm("Cancelar lançamento?")) {
          type === 'SALE' ? cancelSale(id) : cancelExpense(id);
      }
  };

  return (
    <div className="pb-20 space-y-6">
      {/* HEADER ÍNDIGO PASTEL */}
      <div className="bg-indigo-200 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-center h-28">
        <button 
            onClick={onBack} 
            className="absolute left-6 w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-indigo-800 hover:bg-white transition-colors shadow-sm active:scale-95"
            title="Voltar para Home"
        >
          <Home size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight text-center">
            Indicadores
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
          <span className="text-green-600 text-sm font-bold block mb-1">Faturamento</span>
          <span className="text-2xl font-bold text-green-800">R$ {totalRevenue.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-700">Lançamentos (Hoje)</h3></div>
        <div className="divide-y divide-slate-100">
            {filteredSales.map(item => (
                <div key={item.id} className={`p-4 flex justify-between items-center ${item.canceled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 text-green-600"><ArrowUpCircle size={20} /></div>
                        <div>
                            <p className="font-bold text-sm text-slate-800">Venda #{item.id.substring(0,4)} - {item.payment_method}</p>
                            <p className="text-xs text-slate-500">{new Date(item.sale_datetime).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                        <span className="font-bold text-green-600">R$ {item.net_value.toFixed(2)}</span>
                        {!item.canceled && <button onClick={() => handleCancel(item.id, 'SALE')}><Trash2 size={16} className="text-red-400" /></button>}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default KpiScreen;