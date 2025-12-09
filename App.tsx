import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './contexts/StoreContext';
import DashboardScreen from './screens/DashboardScreen';
import PosScreen from './screens/PosScreen';
import InventoryScreen from './screens/InventoryScreen';
import FinanceScreen from './screens/FinanceScreen';
import KpiScreen from './screens/KpiScreen';
import TeamScreen from './screens/TeamScreen';
import EmployeeMealScreen from './screens/EmployeeMealScreen';
import LoginScreen from './screens/LoginScreen';
import SettingsScreen from './screens/SettingsScreen';

const LoadingOverlay = () => {
  const { isLoading } = useStore();
  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-[999] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-bounce">
         <div className="text-6xl select-none">🍔</div>
         <p className="text-slate-600 font-bold text-sm">Processando...</p>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { currentUser } = useStore();
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  // Se não estiver logado, mostra apenas Login
  if (!currentUser) {
    return (
        <>
            <LoadingOverlay />
            <LoginScreen />
        </>
    );
  }

  // Lógica de proteção de rota (Ex: Venda não acessa Financeiro)
  const isVenda = currentUser.role === 'venda';
  const restrictedScreensForVenda = ['inventory', 'finance', 'kpi', 'employees', 'settings'];

  if (isVenda && restrictedScreensForVenda.includes(currentScreen)) {
      // Se tentar acessar, joga pro dashboard
      setCurrentScreen('dashboard');
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen onNavigate={setCurrentScreen} />;
      case 'pos': return <PosScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'inventory': return <InventoryScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'finance': return <FinanceScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'kpi': return <KpiScreen onBack={() => setCurrentScreen('dashboard')} />;
      // Rota atualizada para usar o layout rosa solicitado (EmployeeMealScreen)
      case 'employees': return <EmployeeMealScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'settings': return <SettingsScreen onBack={() => setCurrentScreen('dashboard')} />;
      default: return <DashboardScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <LoadingOverlay />
      <main className="max-w-7xl mx-auto p-4 md:p-6 w-full flex-grow">{renderScreen()}</main>
      <footer className="w-full py-4 text-center border-t border-slate-200 bg-slate-100 mt-auto">
         <p className="text-slate-500 text-xs md:text-sm font-medium">Dev: Alexandre Cavalcante – R3 Builder®</p>
      </footer>
    </div>
  );
};

const App = () => (
  <StoreProvider>
    <AppContent />
  </StoreProvider>
);

export default App;