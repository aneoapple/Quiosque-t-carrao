
import React, { useState, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Product, PaymentMethod } from '../types';
import { 
  Search, Minus, Plus, Trash2, CreditCard, Banknote, QrCode, 
  Home, ShoppingBag, Image as ImageIcon, ChevronDown, ChevronUp, UserCheck, X, Tag, ToggleLeft, ToggleRight
} from 'lucide-react';

interface PosScreenProps {
  onBack: () => void;
}

interface CartItemState {
  product: Product;
  quantity: number;
}

const PosScreen: React.FC<PosScreenProps> = ({ onBack }) => {
  const { products, categories, createSale, employees, addMealConsumption } = useStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCartMinimized, setIsCartMinimized] = useState(true);
  
  // Checkout State
  const [isConsumption, setIsConsumption] = useState(false);

  // Funcionario Payment State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Helper para código curto visual
  const getShortId = (id: string) => id.substring(0, 4).toUpperCase();

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const matchesCategory = selectedCategoryId === 'All' || p.category === selectedCategoryId || categories.find(c => c.id === p.category)?.name === selectedCategoryId;
      
      const shortId = getShortId(p.id).toLowerCase();
      const matchesSearch = !term || 
                            p.name.toLowerCase().includes(term) || 
                            p.id.toLowerCase().includes(term) ||
                            shortId.includes(term);

      return matchesCategory && matchesSearch && p.active;
    });
  }, [products, selectedCategoryId, searchTerm, categories]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const processSale = async (method: string) => {
    const saleItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
      unitCost: item.product.cost
    }));

    // Se "Funcionario" for selecionado como método, força isConsumption = true no contexto
    const saleId = await createSale(saleItems, method, 0, isConsumption);
    
    if (saleId && method === PaymentMethod.FUNCIONARIO && selectedEmployeeId) {
        const today = new Date().toISOString().split('T')[0];
        const description = saleItems.map(i => `${i.quantity}x ${i.productName}`).join(', ');
        
        await addMealConsumption({
            employee_id: selectedEmployeeId,
            meal_date: today,
            value: cartTotal,
            description: `Venda #${saleId.substring(0,6)}: ${description}`,
            related_sale_id: saleId,
            canceled: false
        });
    }

    setCart([]);
    setIsCheckoutModalOpen(false);
    setIsEmployeeModalOpen(false);
    setSelectedEmployeeId('');
    setIsCartMinimized(true);
    setIsConsumption(false);
    alert('Venda realizada com sucesso!');
  };

  const handleCheckout = (method: PaymentMethod) => {
      if (method === PaymentMethod.FUNCIONARIO) {
          setIsEmployeeModalOpen(true);
      } else {
          processSale(method);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
      {/* HEADER LARANJA PASTEL */}
      <div className="bg-orange-200 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-4 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-center h-28 flex-shrink-0 z-30">
        <button 
            onClick={onBack} 
            className="absolute left-6 w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-orange-800 hover:bg-white transition-colors shadow-sm active:scale-95"
            title="Voltar para Home"
        >
          <Home size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-orange-900 tracking-tight text-center">
            Vender Agora
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:gap-6 flex-1 overflow-hidden">
        {/* Lado Esquerdo - Lista de Produtos */}
        <div className="flex-1 flex flex-col gap-3 md:gap-4 overflow-hidden">
          {/* Barra de Busca Melhorada */}
          <div className="relative flex-shrink-0 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" size={20} />
            <input 
              type="text" 
              autoComplete="off"
              name="search_pos_products"
              placeholder="Buscar por nome ou código (ex: #A1B2)..." 
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-transparent focus:outline-none font-medium text-slate-700 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X size={18} />
                </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-shrink-0">
            <button 
              onClick={() => setSelectedCategoryId('All')}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedCategoryId === 'All' ? 'bg-slate-800 text-white shadow-md scale-105' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              Todos
            </button>
            {categories.filter(c => c.active).map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.name)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedCategoryId === cat.name ? 'bg-orange-500 text-white shadow-md scale-105' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pb-4 pr-1">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-transform hover:shadow-md hover:-translate-y-1 relative group">
                    {/* Código Visual no Card */}
                    <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                        <Tag size={10} /> #{getShortId(product.id)}
                    </div>

                    <div className="h-24 md:h-32 bg-slate-100 relative overflow-hidden">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon size={32} />
                            </div>
                        )}
                        <button 
                            onClick={() => addToCart(product)}
                            className="absolute bottom-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform hover:bg-orange-600"
                        >
                            <Plus size={20} className="md:w-6 md:h-6" />
                        </button>
                    </div>
                    <div className="p-2 md:p-3 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-slate-800 text-xs md:text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                            <p className="text-[10px] md:text-xs text-slate-500">{product.unit}</p>
                        </div>
                        <p className="text-green-600 font-bold text-base md:text-lg mt-1 md:mt-2">R$ {product.price.toFixed(2)}</p>
                    </div>
                </div>
                ))}
            </div>
            {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Search size={48} className="mb-2 opacity-30" />
                    <p className="font-medium">Nenhum produto encontrado</p>
                    <p className="text-xs">Tente buscar pelo código (ex: #7F2A)</p>
                </div>
            )}
          </div>
        </div>

        {/* Lado Direito / Inferior - Carrinho */}
        <div className={`bg-white border-t md:border border-slate-200 md:rounded-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-xl flex flex-col z-20 w-full md:w-96 flex-shrink-0 transition-all duration-300 ease-in-out ${isCartMinimized ? 'h-14 md:h-auto' : 'h-[45vh] md:h-auto'} rounded-t-2xl md:rounded-none`}>
          <div onClick={() => setIsCartMinimized(!isCartMinimized)} className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 md:bg-white md:rounded-t-2xl cursor-pointer md:cursor-default">
            <div className="flex items-center gap-2">
                <h2 className="font-bold text-base md:text-lg">Carrinho ({cartCount})</h2>
                <div className="md:hidden text-slate-400">
                    {isCartMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {isCartMinimized && (
                    <span className="font-bold text-slate-900 md:hidden text-sm">Total: R$ {cartTotal.toFixed(2)}</span>
                )}
                <button onClick={(e) => { e.stopPropagation(); setCart([]); }} className={`text-red-500 text-xs md:text-sm items-center gap-1 font-bold hover:text-red-600 ${isCartMinimized ? 'hidden md:flex' : 'flex'}`}>
                    <Trash2 size={16} /> <span className="hidden md:inline">Limpar</span>
                </button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-3 md:p-4 space-y-3 ${isCartMinimized ? 'hidden md:block' : 'block'}`}>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-4">
                <ShoppingBag size={48} className="mb-2 opacity-50" />
                <p className="text-sm">Carrinho vazio</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                     <div className="w-10 h-10 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-slate-200">
                        {item.product.image_url ? (
                            <img src={item.product.image_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={16} /></div>
                        )}
                     </div>
                     <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-slate-500">R$ {item.product.price.toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-slate-100 ml-2">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-orange-600 active:scale-90">
                      <Minus size={14} />
                    </button>
                    <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center bg-orange-500 text-white rounded-full shadow-sm active:scale-90">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`p-4 bg-slate-50 border-t border-slate-200 ${isCartMinimized ? 'hidden md:block' : 'block'}`}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-slate-600 font-bold">Total</span>
              <span className="text-2xl font-bold text-slate-900">R$ {cartTotal.toFixed(2)}</span>
            </div>
            <button 
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full bg-green-600 text-white font-bold py-3 md:py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 hover:bg-green-700"
            >
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isCheckoutModalOpen && !isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 animate-fade-in shadow-2xl">
            <h2 className="text-2xl font-bold text-center">Forma de Pagamento</h2>
            <div className="text-center text-4xl font-bold text-green-600 mb-2">
              R$ {cartTotal.toFixed(2)}
            </div>

            {/* Toggle Consumo Proprio */}
            <div 
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isConsumption ? 'bg-pink-50 border-pink-200' : 'bg-slate-50 border-slate-100'}`}
                onClick={() => setIsConsumption(!isConsumption)}
            >
                <div className="flex items-center gap-2">
                    <UserCheck className={isConsumption ? 'text-pink-500' : 'text-slate-400'} size={20} />
                    <span className={`font-bold text-sm ${isConsumption ? 'text-pink-700' : 'text-slate-500'}`}>Consumo Funcionário / Interno?</span>
                </div>
                {isConsumption ? <ToggleRight className="text-pink-500" size={28} /> : <ToggleLeft className="text-slate-300" size={28} />}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleCheckout(PaymentMethod.DINHEIRO)} className="bg-green-100 text-green-700 p-6 rounded-2xl flex flex-col items-center gap-2 font-bold active:scale-95 transition-transform hover:bg-green-200">
                <Banknote size={32} /> Dinheiro
              </button>
              <button onClick={() => handleCheckout(PaymentMethod.PIX)} className="bg-teal-100 text-teal-700 p-6 rounded-2xl flex flex-col items-center gap-2 font-bold active:scale-95 transition-transform hover:bg-teal-200">
                <QrCode size={32} /> Pix
              </button>
              <button onClick={() => handleCheckout(PaymentMethod.DEBITO)} className="bg-blue-100 text-blue-700 p-6 rounded-2xl flex flex-col items-center gap-2 font-bold active:scale-95 transition-transform hover:bg-blue-200">
                <CreditCard size={32} /> Débito
              </button>
              <button onClick={() => handleCheckout(PaymentMethod.CREDITO)} className="bg-indigo-100 text-indigo-700 p-6 rounded-2xl flex flex-col items-center gap-2 font-bold active:scale-95 transition-transform hover:bg-indigo-200">
                <CreditCard size={32} /> Crédito
              </button>
              <button onClick={() => handleCheckout(PaymentMethod.FUNCIONARIO)} className="col-span-2 bg-pink-100 text-pink-700 p-6 rounded-2xl flex flex-row items-center justify-center gap-4 font-bold active:scale-95 transition-transform hover:bg-pink-200">
                <UserCheck size={32} /> Vale Funcionário (Registrar)
              </button>
            </div>
            <button onClick={() => setIsCheckoutModalOpen(false)} className="w-full py-3 text-slate-500 font-semibold hover:text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Employee Selection Modal */}
      {isEmployeeModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 animate-fade-in shadow-2xl">
                <h3 className="text-xl font-bold text-center">Selecionar Funcionário</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {employees.filter(e => e.active).map(emp => (
                        <button
                            key={emp.id}
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            className={`w-full p-3 rounded-xl border text-left font-bold transition-colors ${selectedEmployeeId === emp.id ? 'bg-pink-500 text-white border-pink-500 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                        >
                            {emp.name}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => processSale(PaymentMethod.FUNCIONARIO)} 
                    disabled={!selectedEmployeeId}
                    className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200"
                >
                    Confirmar
                </button>
                <button onClick={() => setIsEmployeeModalOpen(false)} className="w-full text-slate-400 font-bold py-2 hover:text-slate-600">
                    Voltar
                </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default PosScreen;
