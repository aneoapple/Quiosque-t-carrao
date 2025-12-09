
import React, { useState, useRef } from 'react';
import { useStore } from '../contexts/StoreContext';
import { MovementType, ProductType, Product, Category } from '../types';
import { 
  ChevronLeft, ArrowDownCircle, ArrowUpCircle, AlertCircle, Plus, ClipboardCheck, 
  X, Save, Tags, Image as ImageIcon, Sparkles, Upload, Edit2, Trash2, Home, Filter
} from 'lucide-react';

interface InventoryScreenProps {
  onBack: () => void;
}

const InventoryScreen: React.FC<InventoryScreenProps> = ({ onBack }) => {
  const { 
    products, categories, getProductStock, addMovement, 
    addProduct, updateProduct, removeProduct, 
    addCategory, updateCategory, removeCategory, 
    generateProductImage 
  } = useStore();

  const [filter, setFilter] = useState<'ALL' | 'LOW'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'ENTRY' | 'EXIT' | 'ADJUST' | 'NEW_PRODUCT' | 'CATEGORIES' | null>(null);
  const [movementSubType, setMovementSubType] = useState<string>('');
  
  const [qtyInput, setQtyInput] = useState('');
  const [obsInput, setObsInput] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Campo dedicado para "Estoque Atual" no formulário
  const [currentStockInput, setCurrentStockInput] = useState('');

  // Referência para o input de arquivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States para Produtos
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', category: '', type: 'Produto Final', unit: 'un', price: 0, cost: 0, min_stock: 0, active: true, image_url: ''
  });

  // States para Categorias
  const [editingCategory, setEditingCategory] = useState<Partial<Category>>({ name: '', color: 'bg-slate-500', active: true });

  const resetModals = () => {
    setModalType(null); setSelectedProduct(null); setQtyInput(''); setObsInput(''); setMovementSubType('');
    setCurrentStockInput('');
    setNewProduct({ id: undefined, name: '', category: '', type: 'Produto Final', unit: 'un', price: 0, cost: 0, min_stock: 0, active: true, image_url: '' });
    setEditingCategory({ name: '', color: 'bg-slate-500', active: true });
  };

  const handleSaveMovement = async () => {
    if (!selectedProduct || !modalType || !qtyInput) return;
    const qty = parseInt(qtyInput);
    if (isNaN(qty) || qty <= 0) return;

    // Determina o tipo e a origem com base na seleção
    const type = movementSubType || (modalType === 'ENTRY' ? MovementType.ENTRADA_COMPRA : MovementType.SAIDA_PERDA);
    
    let origin = 'Movimentação Manual';
    if (type === MovementType.ENTRADA_COMPRA) origin = 'Compra Manual';
    else if (type === MovementType.PRODUCAO) origin = 'Produção Interna';
    else if (type === MovementType.ENTRADA_AJUSTE) origin = 'Ajuste de Entrada';
    else if (type === MovementType.SAIDA_PERDA) origin = 'Perda/Quebra Manual';
    else if (type === MovementType.SAIDA_CONSUMO) origin = 'Consumo Interno';

    await addMovement({
      product_id: selectedProduct,
      quantity: qty,
      movement_type: type,
      origin: origin,
      notes: obsInput
    });
    resetModals();
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct || !qtyInput) return;
    const currentStock = getProductStock(selectedProduct);
    const physicalCount = parseInt(qtyInput);
    if (isNaN(physicalCount)) return;

    const diff = physicalCount - currentStock;
    if (diff !== 0) {
      await addMovement({
        product_id: selectedProduct,
        quantity: diff,
        movement_type: MovementType.AJUSTE,
        origin: 'Ajuste de Inventário',
        notes: obsInput || 'Correção de contagem física'
      });
    }
    resetModals();
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.category) {
        alert("Preencha nome e categoria.");
        return;
    }

    const stockVal = parseInt(currentStockInput) || 0;

    if (newProduct.id) {
        // EDIT MODE
        await updateProduct(newProduct as Product);
        
        // Verifica se o estoque foi alterado manualmente no input
        const current = getProductStock(newProduct.id);
        if (stockVal !== current) {
             const diff = stockVal - current;
             // Lança movimentação de ajuste para bater o estoque
             await addMovement({
                 product_id: newProduct.id,
                 quantity: diff, // pode ser negativo
                 movement_type: MovementType.AJUSTE,
                 origin: 'Ajuste no Cadastro',
                 notes: 'Alteração direta no formulário de edição'
             });
        }
    } else {
        // CREATE MODE
        const newId = await addProduct(newProduct as Product);
        
        // Se criou com sucesso e tem estoque inicial > 0, lança entrada
        if (newId && stockVal > 0) {
             await addMovement({
                 product_id: newId,
                 quantity: stockVal,
                 movement_type: MovementType.ENTRADA_AJUSTE,
                 origin: 'Estoque Inicial',
                 notes: 'Cadastro inicial do produto'
             });
        }
    }
    resetModals();
  };

  const handleEditProduct = (product: Product) => {
      setNewProduct(product);
      // Carrega o estoque atual para o input
      setCurrentStockInput(getProductStock(product.id).toString());
      setModalType('NEW_PRODUCT');
  };

  const handleDeleteProduct = async (product: Product) => {
      if (window.confirm(`Tem certeza que deseja excluir "${product.name}"?`)) {
          await removeProduct(product.id);
      }
  };

  // --- CATEGORY HANDLERS ---
  const handleSaveCategory = async () => {
      if(!editingCategory.name) return alert("Digite o nome da categoria");
      
      if(editingCategory.id) {
          await updateCategory(editingCategory as Category);
      } else {
          await addCategory(editingCategory as Omit<Category, 'id'>);
      }
      setEditingCategory({ name: '', color: 'bg-slate-500', active: true });
  };

  const handleEditCategoryClick = (cat: Category) => {
      setEditingCategory(cat);
  };

  const handleDeleteCategory = async (id: string) => {
      if(confirm('Tem certeza que deseja excluir esta categoria?')) {
          await removeCategory(id);
      }
  };

  // Função para gerar imagem com IA
  const handleGenerateAI = async () => {
      if(!newProduct.name || !newProduct.category) return alert("Preencha o nome e selecione a categoria.");
      if (newProduct.image_url && !window.confirm("Substituir imagem atual?")) return;

      setIsGeneratingImage(true);
      const imageUrl = await generateProductImage(newProduct.name, newProduct.category);
      if (imageUrl) {
        setNewProduct(prev => ({ ...prev, image_url: imageUrl }));
      } else {
        alert("Não foi possível gerar a imagem. Verifique sua conexão ou API Key.");
      }
      setIsGeneratingImage(false);
  };

  // Função para upload de imagem local
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Converte o arquivo para Base64 e salva no estado
        setNewProduct(prev => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const productList = products.filter(p => {
    if (!p.active) return false;
    if (filter === 'LOW') return getProductStock(p.id) <= p.min_stock;
    return true;
  });

  const categoryColors = [
      'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 
      'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-slate-500', 'bg-black'
  ];

  return (
    <div className="pb-20">
      {/* HEADER VERDE (EMERALD) PASTEL */}
      <div className="bg-emerald-200 p-4 -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-6 rounded-b-[2.5rem] shadow-sm relative flex items-center justify-center h-28">
        <button 
            onClick={onBack} 
            className="absolute left-6 w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-emerald-800 hover:bg-white transition-colors shadow-sm active:scale-95"
            title="Voltar para Home"
        >
          <Home size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-emerald-900 tracking-tight text-center">
            Estoque
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => setModalType('NEW_PRODUCT')} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
          <div className="bg-white/20 p-2 rounded-full"><Plus size={24} /></div><span className="font-bold text-xs md:text-sm text-center">Novo Produto</span>
        </button>
        <button onClick={() => setModalType('CATEGORIES')} className="bg-slate-700 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
          <div className="bg-white/20 p-2 rounded-full"><Tags size={24} /></div><span className="font-bold text-xs md:text-sm text-center">Categorias</span>
        </button>
        <button onClick={() => setModalType('ADJUST')} className="bg-purple-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
          <div className="bg-white/20 p-2 rounded-full"><ClipboardCheck size={24} /></div><span className="font-bold text-xs md:text-sm text-center">Ajustar Estoque</span>
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 items-center">
        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-full font-bold text-sm transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300'}`}>Todos</button>
        <button onClick={() => setFilter('LOW')} className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${filter === 'LOW' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-300 text-orange-600'}`}><AlertCircle size={16} /> Baixo Estoque</button>
        
        {filter !== 'ALL' && (
            <button onClick={() => setFilter('ALL')} className="px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap bg-slate-200 text-slate-600 hover:bg-slate-300">
                <X size={16} /> Limpar Filtro
            </button>
        )}
      </div>

      <div className="space-y-3">
        {productList.map(product => {
          const stock = getProductStock(product.id);
          const isLow = stock <= product.min_stock;
          return (
            <div key={product.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div onClick={() => handleEditProduct(product)} className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 cursor-pointer">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={20} /></div>}
                </div>
                <div onClick={() => handleEditProduct(product)} className="cursor-pointer flex-1">
                    <h3 className="font-bold text-slate-800">{product.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            Atual: {stock} {product.unit}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            Mín: {product.min_stock}
                        </span>
                    </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="flex gap-2 mr-2">
                    <button onClick={() => { setSelectedProduct(product.id); setModalType('ENTRY'); setMovementSubType(MovementType.ENTRADA_COMPRA); }} className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center active:scale-95 transition-transform"><ArrowUpCircle size={22} /></button>
                    <button onClick={() => { setSelectedProduct(product.id); setModalType('EXIT'); setMovementSubType(MovementType.SAIDA_PERDA); }} className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center active:scale-95 transition-transform"><ArrowDownCircle size={22} /></button>
                </div>
                <div className="flex gap-2 border-l pl-3 border-slate-100">
                    <button onClick={() => handleEditProduct(product)} className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center active:scale-95 transition-transform hover:bg-indigo-100"><Edit2 size={20} /></button>
                    <button onClick={() => handleDeleteProduct(product)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center active:scale-95 transition-transform hover:bg-red-50 hover:text-red-500"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW PRODUCT MODAL */}
      {modalType === 'NEW_PRODUCT' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-fade-in shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4 text-center text-slate-800">{newProduct.id ? 'Editar' : 'Novo'} Produto</h2>
            <div className="space-y-4">
                 
                 {/* Image Section */}
                 <div className="w-32 h-32 bg-slate-50 mx-auto rounded-xl overflow-hidden relative border border-slate-200 shadow-inner">
                    {newProduct.image_url ? (
                        <img src={newProduct.image_url} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={32} />
                        </div>
                    )}
                     {isGeneratingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Sparkles className="animate-spin text-yellow-400"/></div>}
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-slate-300 transition-colors"
                    >
                        <Upload size={16} /> Upload
                    </button>
                    <button 
                        onClick={handleGenerateAI} 
                        disabled={isGeneratingImage} 
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
                    >
                        <Sparkles size={16} /> Gerar c/ IA
                    </button>
                    {/* Input oculto para upload de arquivo */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                 </div>

                 {/* Fields with Labels */}
                 <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome do Produto</label>
                        <input 
                            placeholder="Ex: Coxinha de Frango" 
                            value={newProduct.name} 
                            onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                            className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" 
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
                        <select 
                            value={newProduct.category} 
                            onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                            className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                        >
                            <option value="">Selecione...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                 </div>

                 {/* Row 1: Prices */}
                 <div className="grid grid-cols-2 gap-4 mt-2">
                     <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Preço Venda (R$)</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={newProduct.price} 
                            onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} 
                            className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Custo Unit. (R$)</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={newProduct.cost} 
                            onChange={e => setNewProduct({...newProduct, cost: parseFloat(e.target.value)})} 
                            className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                     </div>
                 </div>

                 {/* Row 2: Stock & Unit */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estoque Atual</label>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={currentStockInput} 
                            onChange={e => setCurrentStockInput(e.target.value)} 
                            className="w-full p-3 border-2 border-indigo-100 rounded-xl font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50" 
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estoque Mínimo</label>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={newProduct.min_stock} 
                            onChange={e => setNewProduct({...newProduct, min_stock: parseFloat(e.target.value)})} 
                            className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Unidade</label>
                    <select 
                        value={newProduct.unit} 
                        onChange={e => setNewProduct({...newProduct, unit: e.target.value})} 
                        className="w-full p-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="un">un (Unidade)</option>
                        <option value="pct">pct (Pacote)</option>
                        <option value="kg">kg (Quilo)</option>
                        <option value="g">g (Grama)</option>
                        <option value="ml">ml (Mililitro)</option>
                        <option value="l">l (Litro)</option>
                        <option value="lata">lata</option>
                        <option value="cx">cx (Caixa)</option>
                    </select>
                </div>

                 <button onClick={handleSaveProduct} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2">
                    <Save size={20} /> Salvar Produto
                 </button>
            </div>
             <button onClick={resetModals} className="mt-4 w-full text-slate-400 font-bold hover:text-slate-600 py-2">Cancelar</button>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {modalType === 'CATEGORIES' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-fade-in shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-center text-slate-800">Gerenciar Categorias</h2>
            
            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
                {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer" onClick={() => handleEditCategoryClick(cat)}>
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${cat.color || 'bg-slate-400'}`}></div>
                            <span className="font-bold text-slate-700">{cat.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="text-slate-400 hover:text-red-500 p-1">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add / Edit Form */}
            <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}</label>
                <div className="flex gap-2 mb-3">
                    <input 
                        value={editingCategory.name}
                        onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                        placeholder="Nome da categoria"
                        className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                </div>
                
                {/* Color Picker */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                    {categoryColors.map(color => (
                        <button 
                            key={color}
                            onClick={() => setEditingCategory({...editingCategory, color})}
                            className={`w-8 h-8 rounded-full flex-shrink-0 border-2 ${color} ${editingCategory.color === color ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                        />
                    ))}
                </div>

                <div className="flex gap-2">
                    {editingCategory.id && (
                        <button onClick={() => setEditingCategory({ name: '', color: 'bg-slate-500', active: true })} className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold active:scale-95 transition-transform text-sm">
                            Cancelar
                        </button>
                    )}
                    <button onClick={handleSaveCategory} className="flex-[2] bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <Plus size={18} /> {editingCategory.id ? 'Atualizar' : 'Adicionar'}
                    </button>
                </div>
            </div>

            <button onClick={resetModals} className="mt-4 w-full text-slate-400 font-bold text-sm hover:text-slate-600">Fechar</button>
          </div>
        </div>
      )}
      
      {(modalType === 'ENTRY' || modalType === 'EXIT' || modalType === 'ADJUST') && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                 <h3 className="font-bold mb-4 text-slate-800 text-center">
                    {modalType === 'ENTRY' ? 'Entrada de Estoque' : modalType === 'EXIT' ? 'Saída de Estoque' : 'Ajuste Manual'}
                 </h3>
                 
                 {modalType !== 'ADJUST' && (
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Movimento</label>
                        <select 
                            value={movementSubType} 
                            onChange={(e) => setMovementSubType(e.target.value)}
                            className="w-full border p-3 rounded-lg font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {modalType === 'ENTRY' ? (
                                <>
                                    <option value={MovementType.ENTRADA_COMPRA}>Compra</option>
                                    <option value={MovementType.PRODUCAO}>Produção</option>
                                    <option value={MovementType.ENTRADA_AJUSTE}>Ajuste (Entrada)</option>
                                </>
                            ) : (
                                <>
                                    <option value={MovementType.SAIDA_PERDA}>Perda / Quebra</option>
                                    <option value={MovementType.SAIDA_CONSUMO}>Consumo Interno</option>
                                </>
                            )}
                        </select>
                    </div>
                 )}

                 <div className="mb-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quantidade</label>
                    <input 
                        type="number" 
                        autoFocus 
                        placeholder="0" 
                        value={qtyInput} 
                        onChange={e => setQtyInput(e.target.value)} 
                        className="w-full border p-3 rounded-lg text-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                 </div>

                 <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Observação</label>
                    <input 
                        placeholder="Ex: Nota Fiscal 123" 
                        value={obsInput} 
                        onChange={e => setObsInput(e.target.value)} 
                        className="w-full border p-3 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                 </div>

                 <div className="flex gap-2">
                     <button onClick={resetModals} className="flex-1 text-slate-500 font-bold hover:bg-slate-50 rounded-lg py-3">Cancelar</button>
                     <button onClick={modalType === 'ADJUST' ? handleSaveAdjustment : handleSaveMovement} className="flex-1 bg-indigo-600 text-white rounded-lg font-bold shadow-lg active:scale-95 transition-transform">Salvar</button>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default InventoryScreen;
