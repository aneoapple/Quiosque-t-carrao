import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Home, UserPlus, Utensils, Trash2, Edit2, Plus, X, Users, Clock, Calendar } from 'lucide-react';
import { Employee } from '../types';

interface TeamScreenProps { onNavigate: (screen: string) => void; }

const TeamScreen: React.FC<TeamScreenProps> = ({ onNavigate }) => {
  const { employees, mealConsumptions, shifts, timeRecords, addEmployee, updateEmployee, addMealConsumption, addShift, addTimeRecord } = useStore();
  const [activeTab, setActiveTab] = useState('EMPLOYEES');
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee>>({});

  const handleSaveEmployee = async () => {
      if(!editingEmp.name) return;
      if(editingEmp.id) await updateEmployee(editingEmp as Employee);
      else await addEmployee(editingEmp as Employee);
      setIsEmpModalOpen(false);
  };

  return (
    <div className="pb-32">
      <div className="bg-pink-200 p-4 -mx-4 -mt-4 mb-6 rounded-b-[2.5rem] flex items-center justify-center h-28 relative">
         <button onClick={() => onNavigate('dashboard')} className="absolute left-6 p-2 bg-white/60 rounded-full"><Home size={24} /></button>
         <h1 className="text-2xl font-black text-pink-900">Gestão Equipe</h1>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-4 z-40">
        <button onClick={() => setActiveTab('EMPLOYEES')} className={`flex-1 py-3 rounded-2xl font-bold flex gap-2 justify-center ${activeTab === 'EMPLOYEES' ? 'bg-pink-500 text-white' : 'bg-slate-50'}`}><Users /> Equipe</button>
        <button onClick={() => setActiveTab('SHIFTS')} className={`flex-1 py-3 rounded-2xl font-bold flex gap-2 justify-center ${activeTab === 'SHIFTS' ? 'bg-pink-500 text-white' : 'bg-slate-50'}`}><Calendar /> Escala</button>
        <button onClick={() => setActiveTab('TIME')} className={`flex-1 py-3 rounded-2xl font-bold flex gap-2 justify-center ${activeTab === 'TIME' ? 'bg-pink-500 text-white' : 'bg-slate-50'}`}><Clock /> Ponto</button>
      </div>

      {activeTab === 'EMPLOYEES' && (
          <div className="space-y-4">
              <button onClick={() => { setEditingEmp({}); setIsEmpModalOpen(true); }} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold flex justify-center gap-2"><UserPlus /> Novo Funcionário</button>
              {employees.map(emp => (
                  <div key={emp.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm">
                      <div>
                          <h3 className="font-bold text-lg">{emp.name}</h3>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-bold">{emp.role}</span>
                      </div>
                      <button onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }} className="p-2 bg-pink-50 text-pink-600 rounded-full"><Edit2 size={20} /></button>
                  </div>
              ))}
          </div>
      )}

      {isEmpModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm p-6">
                  <h3 className="font-bold text-xl mb-4">Funcionário</h3>
                  <input placeholder="Nome" value={editingEmp.name || ''} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full border p-3 rounded-xl mb-3" />
                  <input placeholder="Cargo" value={editingEmp.role || ''} onChange={e => setEditingEmp({...editingEmp, role: e.target.value})} className="w-full border p-3 rounded-xl mb-3" />
                  <input type="number" placeholder="Limite Refeição" value={editingEmp.daily_meal_limit || ''} onChange={e => setEditingEmp({...editingEmp, daily_meal_limit: parseFloat(e.target.value)})} className="w-full border p-3 rounded-xl mb-3" />
                  <button onClick={handleSaveEmployee} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                  <button onClick={() => setIsEmpModalOpen(false)} className="w-full mt-2 text-slate-400">Cancelar</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default TeamScreen;