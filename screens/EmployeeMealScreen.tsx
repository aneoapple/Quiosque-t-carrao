import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import {
    Home,
    UserPlus,
    Utensils,
    Trash2,
    Edit2,
    Plus,
    X,
    Users,
    DollarSign,
    ShoppingBag,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import { Employee, MealConsumption } from '../types';

interface EmployeeMealScreenProps {
    onBack: () => void;
}

const EmployeeMealScreen: React.FC<EmployeeMealScreenProps> = ({ onBack }) => {
    const {
        employees,
        mealConsumptions,
        addEmployee,
        updateEmployee,
        addMealConsumption,
        cancelMealConsumption,
        // KPI Data
        sales,
        products,
        getProductStock,
        shifts
    } = useStore();

    const [activeTab, setActiveTab] = useState<'DAILY' | 'EMPLOYEES'>('DAILY');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Modal States
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(null);

    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [newMeal, setNewMeal] = useState<Partial<MealConsumption>>({ value: 0, description: '' });

    // --- KPI CALCULATIONS ---
    const today = new Date().toISOString().split('T')[0];
    const todaysSales = sales.filter(s => s.sale_datetime && s.sale_datetime.startsWith(today) && !s.canceled);
    const dailyRevenue = todaysSales.reduce((acc, curr) => acc + curr.net_value, 0);
    const dailyTicket = todaysSales.length > 0 ? dailyRevenue / todaysSales.length : 0;
    const lowStockCount = products.filter(p => getProductStock(p.id) <= p.min_stock).length;
    const scheduledEmployeesCount = (shifts || []).filter(s => s.shift_date === today && s.status !== 'Folga').length;

    // Helpers
    const handleSaveEmployee = () => {
        if (!editingEmp?.name || !editingEmp?.daily_meal_limit) return;

        if (editingEmp.id) {
            updateEmployee(editingEmp as Employee);
        } else {
            addEmployee({
                name: editingEmp.name,
                role: editingEmp.role || '',
                daily_meal_limit: Number(editingEmp.daily_meal_limit),
                active: true
            });
        }
        setIsEmpModalOpen(false);
        setEditingEmp(null);
    };

    const handleSaveMeal = () => {
        if (!newMeal.employee_id || !newMeal.value || !newMeal.description) return;

        addMealConsumption({
            employee_id: newMeal.employee_id,
            meal_date: selectedDate + 'T12:00:00', // Simplified time
            value: Number(newMeal.value),
            description: newMeal.description,
            canceled: false
        });
        setIsMealModalOpen(false);
        setNewMeal({ value: 0, description: '' });
    };

    const getDailyStats = (empId: string) => {
        const consumed = mealConsumptions
            .filter(m => m.employee_id === empId && m.meal_date.startsWith(selectedDate) && !m.canceled)
            .reduce((acc, curr) => acc + curr.value, 0);
        return consumed;
    };

    return (
        <div className="pb-32"> {/* Extra padding bottom for fixed footer */}

            {/* CABEÇALHO ROSA PASTEL */}
            <div className="bg-pink-200 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-center h-28">
                <button
                    onClick={onBack}
                    className="absolute left-6 w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-pink-800 hover:bg-white transition-colors shadow-sm active:scale-95"
                    title="Voltar para Home"
                >
                    <Home size={24} />
                </button>
                <h1 className="text-2xl md:text-3xl font-black text-pink-900 tracking-tight text-center">
                    Alimentação Equipe
                </h1>
            </div>

            {/* KPI CARDS SECTION (Scrollable) */}
            <div className="mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-3 min-w-max">
                    {/* Card Faturamento */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-40 flex-shrink-0">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <DollarSign size={18} /> <span className="text-xs font-bold">Faturamento</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">R$ {dailyRevenue.toFixed(2)}</p>
                    </div>

                    {/* Card Vendas */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-36 flex-shrink-0">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <ShoppingBag size={18} /> <span className="text-xs font-bold">Vendas</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">{todaysSales.length}</p>
                    </div>

                    {/* Card Ticket Médio */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-40 flex-shrink-0">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <TrendingUp size={18} /> <span className="text-xs font-bold">Ticket Médio</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">R$ {dailyTicket.toFixed(2)}</p>
                    </div>

                    {/* Card Estoque Baixo */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-36 flex-shrink-0">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <AlertTriangle size={18} /> <span className="text-xs font-bold">Estoque Baixo</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">{lowStockCount}</p>
                    </div>

                    {/* Card Equipe */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-36 flex-shrink-0">
                        <div className="flex items-center gap-2 text-pink-600 mb-1">
                            <Users size={18} /> <span className="text-xs font-bold">Escalados</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">{scheduledEmployeesCount}</p>
                    </div>
                </div>
            </div>

            {/* DAILY CONSUMPTION VIEW */}
            {activeTab === 'DAILY' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50"
                        />
                        <button
                            onClick={() => { setNewMeal({ value: 0, description: '' }); setIsMealModalOpen(true); }}
                            className="bg-pink-500 text-white p-3 px-6 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-pink-200 active:scale-95 transition-transform"
                        >
                            <Plus size={20} /> Registrar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {employees.filter(e => e.active !== false).map(emp => {
                            const consumed = getDailyStats(emp.id);
                            const limit = emp.daily_meal_limit || 0; // Default to 0 if not persisted
                            const remaining = limit - consumed;
                            const percent = limit > 0 ? Math.min((consumed / limit) * 100, 100) : 0;
                            const isOver = remaining < 0;

                            return (
                                <div key={emp.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                                {emp.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-800 leading-tight">{emp.name}</h3>
                                                <p className="text-xs text-slate-500">{emp.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo</p>
                                                <button
                                                    onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }}
                                                    className="p-1 text-slate-300 hover:text-pink-500 transition-colors"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                            <p className={`font-black text-xl ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                                                R$ {remaining.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4 relative z-10">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>

                                    {/* Daily Details */}
                                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-50 relative z-10">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Refeições Hoje</p>
                                        {mealConsumptions
                                            .filter(m => m.employee_id === emp.id && m.meal_date.startsWith(selectedDate))
                                            .map(meal => (
                                                <div key={meal.id} className={`flex justify-between items-center text-sm group ${meal.canceled ? 'opacity-40' : ''}`}>
                                                    <span className={`text-slate-600 font-medium ${meal.canceled ? 'line-through' : ''}`}>
                                                        {meal.description} {meal.canceled && '(Cancelado)'}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-800">R$ {meal.value.toFixed(2)}</span>
                                                        {!meal.canceled && (
                                                            <button
                                                                onClick={() => { if (confirm('Cancelar esta refeição?')) cancelMealConsumption(meal.id); }}
                                                                className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        {mealConsumptions.filter(m => m.employee_id === emp.id && m.meal_date.startsWith(selectedDate)).length === 0 && (
                                            <p className="text-xs text-slate-400 italic">Nenhum registro.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* EMPLOYEES LIST VIEW */}
            {activeTab === 'EMPLOYEES' && (
                <div className="space-y-4 animate-fade-in">
                    <button
                        onClick={() => { setEditingEmp({}); setIsEmpModalOpen(true); }}
                        className="w-full py-4 rounded-2xl bg-slate-800 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-95 transition-transform"
                    >
                        <UserPlus /> Novo Funcionário
                    </button>

                    <div className="space-y-3">
                        {employees.map(emp => (
                            <div key={emp.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-lg">
                                        {emp.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{emp.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{emp.role}</span>
                                            <span className="text-xs text-slate-400">Limite: R$ {emp.daily_meal_limit.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }}
                                    className="w-10 h-10 flex items-center justify-center text-pink-600 bg-pink-50 rounded-full hover:bg-pink-100 active:scale-95 transition-colors"
                                >
                                    <Edit2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 md:pb-4 flex gap-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => setActiveTab('DAILY')}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'DAILY' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 transform -translate-y-1' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                    <Utensils size={20} /> Consumo Diário
                </button>
                <button
                    onClick={() => setActiveTab('EMPLOYEES')}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'EMPLOYEES' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 transform -translate-y-1' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                    <Users size={20} /> Funcionários
                </button>
            </div>

            {/* EMPLOYEE MODAL */}
            {isEmpModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in">
                        <h2 className="text-xl font-bold mb-6 text-center text-slate-800">{editingEmp?.id ? 'Editar' : 'Novo'} Funcionário</h2>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Nome</label>
                                <input
                                    className="w-full p-2 bg-transparent outline-none font-bold text-slate-800"
                                    value={editingEmp?.name || ''}
                                    onChange={e => setEditingEmp({ ...editingEmp, name: e.target.value })}
                                />
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Cargo</label>
                                <input
                                    className="w-full p-2 bg-transparent outline-none font-bold text-slate-800"
                                    value={editingEmp?.role || ''}
                                    onChange={e => setEditingEmp({ ...editingEmp, role: e.target.value })}
                                />
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Limite Diário (R$)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full p-2 bg-transparent outline-none font-bold text-slate-800"
                                    value={editingEmp?.daily_meal_limit || ''}
                                    onChange={e => setEditingEmp({ ...editingEmp, daily_meal_limit: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setIsEmpModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={handleSaveEmployee} className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-transform">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MEAL MODAL */}
            {isMealModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-fade-in relative">
                        <button onClick={() => setIsMealModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-center text-slate-800 mb-6">Registrar Refeição</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase ml-1">Funcionário</label>
                                <div className="relative">
                                    <select
                                        className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-pink-500"
                                        value={newMeal.employee_id || ''}
                                        onChange={e => setNewMeal({ ...newMeal, employee_id: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {employees.filter(e => e.active).map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <UserPlus size={18} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase ml-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full p-4 border border-slate-200 rounded-2xl text-2xl font-black text-pink-500 outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                    value={newMeal.value || ''}
                                    onChange={e => setNewMeal({ ...newMeal, value: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase ml-1">Descrição</label>
                                <input
                                    type="text"
                                    placeholder="Ex: X-Salada + Refri"
                                    className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-pink-500"
                                    value={newMeal.description || ''}
                                    onChange={e => setNewMeal({ ...newMeal, description: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSaveMeal}
                                disabled={!newMeal.employee_id || !newMeal.value}
                                className="w-full bg-pink-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-pink-200 mt-4 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                            >
                                Confirmar Consumo
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EmployeeMealScreen;