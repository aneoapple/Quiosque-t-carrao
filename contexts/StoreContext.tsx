
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { 
  Product, StockMovement, Sale, SaleItem, Expense, Category,
  Employee, MealConsumption, EmployeeShift, EmployeeTimeRecord,
  ProductType, MovementType, SaleStatus, PaymentMethod, User
} from '../types';

interface StoreContextType {
  // Auth
  currentUser: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: string, newPass: string) => Promise<void>;

  // System Users Management
  appUsers: User[];
  addAppUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<void>;
  updateAppUser: (user: User & { password?: string }) => Promise<void>;
  deleteAppUser: (userId: string) => Promise<void>;

  // Data
  products: Product[];
  categories: Category[];
  movements: StockMovement[];
  sales: Sale[];
  expenses: Expense[];
  employees: Employee[];
  mealConsumptions: MealConsumption[];
  shifts: EmployeeShift[];
  timeRecords: EmployeeTimeRecord[];
  
  // Actions
  refreshData: () => Promise<void>;
  
  // Products - Strict Persistence
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<string | null>; // Returns ID
  updateProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  syncProductsWithSupabase: () => Promise<void>; // New Sync Function
  
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  removeCategory: (categoryId: string) => Promise<void>;
  
  addMovement: (movement: Omit<StockMovement, 'id' | 'created_at'>) => Promise<void>;
  
  createSale: (items: any[], paymentMethod: string, discount?: number, isEmployeeConsumption?: boolean) => Promise<string | null>;
  cancelSale: (saleId: string) => Promise<boolean>;
  
  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
  cancelExpense: (expenseId: string) => Promise<void>;
  
  // Employee Actions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  
  addMealConsumption: (meal: Omit<MealConsumption, 'id' | 'created_at'>) => Promise<void>;
  cancelMealConsumption: (mealId: string) => Promise<void>;
  
  addShift: (shift: Omit<EmployeeShift, 'id'>) => Promise<void>;
  addTimeRecord: (record: Omit<EmployeeTimeRecord, 'id'>) => Promise<void>;
  updateTimeRecord: (id: string, updates: Partial<EmployeeTimeRecord>) => Promise<void>;

  generateProductImage: (productName: string, categoryName: string) => Promise<string | null>;
  getProductStock: (productId: string) => number;
  
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Default categories (fallback only, should load from DB)
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Lanches', color: 'bg-orange-500', active: true },
  { id: '2', name: 'Bebidas', color: 'bg-blue-500', active: true },
  { id: '3', name: 'Porções', color: 'bg-yellow-500', active: true },
  { id: '4', name: 'Sobremesas', color: 'bg-pink-500', active: true },
  { id: '5', name: 'Insumos', color: 'bg-slate-500', active: true },
];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUsers, setAppUsers] = useState<User[]>([]); 
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mealConsumptions, setMealConsumptions] = useState<MealConsumption[]>([]);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [timeRecords, setTimeRecords] = useState<EmployeeTimeRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);

  // --- CENTRAL DATA LOADING FUNCTION ---
  const loadInitialData = async (userOverride?: User) => {
    const user = userOverride || currentUser;
    if (!user) return;

    setIsLoading(true);
    console.log("Loading data from Supabase...");

    // We use independent try-catch blocks so one failure doesn't stop the whole app
    
    // 1. Fetch System Users (Admin only)
    if (user.role === 'admin') {
      try {
        const { data: users, error } = await supabase.from('app_users').select('id, username, role').order('username');
        if (error) throw error;
        if (users) setAppUsers(users as User[]);
      } catch (e: any) {
        console.error("Error fetching users:", e?.message || JSON.stringify(e));
      }
    }

    // 2. Fetch Products
    try {
      let allProducts: any[] = [];
      let from = 0;
      const BATCH_SIZE = 5; 
      let hasMore = true;

      while (hasMore) {
        const { data: p, error: pError } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true }) 
          .range(from, from + BATCH_SIZE - 1);

        if (pError) throw pError;

        if (p && p.length > 0) {
          allProducts = [...allProducts, ...p];
          if (p.length < BATCH_SIZE) {
            hasMore = false;
          } else {
            from += BATCH_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      if (allProducts.length > 0) {
        const activeProds = allProducts.filter((x: any) => x.active !== false);
        setProducts(activeProds);
      } else {
        setProducts([]);
      }
    } catch (e: any) {
      console.error("Error fetching products:", e?.message || JSON.stringify(e));
    }

    // 3. Fetch Categories
    try {
      const { data: c, error: cError } = await supabase.from('product_categories').select('*').order('name');
      if (cError) throw cError;
      if (c && c.length > 0) {
          const mappedCats = c.map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              color: cat.color || 'bg-slate-500',
              active: true
          }));
          setCategories(mappedCats);
      } else {
          setCategories(DEFAULT_CATEGORIES);
      }
    } catch (e: any) {
      console.error("Error fetching categories:", e?.message || JSON.stringify(e));
    }

    // 4. Fetch Stock Movements
    try {
      const { data: m, error: mError } = await supabase.from('stock_movements').select('*');
      if (mError) throw mError;
      if (m) setMovements(m);
    } catch (e: any) {
      console.error("Error fetching movements:", e?.message || JSON.stringify(e));
    }

    // 5. Fetch Sales
    try {
      const { data: s, error: sError } = await supabase.from('sales').select('*, sale_items(*)').order('sale_datetime', { ascending: false });
      if (sError) throw sError;
      if (s) setSales(s);
    } catch (e: any) {
      console.error("Error fetching sales:", e?.message || JSON.stringify(e));
    }

    // 6. Fetch Expenses
    try {
      const { data: e, error: eError } = await supabase.from('expenses').select('*');
      if (eError) throw eError;
      if (e) setExpenses(e);
    } catch (e: any) {
      console.error("Error fetching expenses:", e?.message || JSON.stringify(e));
    }

    // 7. Fetch Employees
    try {
      const { data: emp, error: empError } = await supabase.from('employees').select('*').eq('active', true);
      if (empError) throw empError;
      if (emp) setEmployees(emp);
    } catch (e: any) {
      console.error("Error fetching employees:", e?.message || JSON.stringify(e));
    }

    // 8. Fetch Meals
    try {
      const { data: meals, error: mealsError } = await supabase.from('employee_meals').select('*');
      if (mealsError) throw mealsError;
      if (meals) setMealConsumptions(meals);
    } catch (e: any) {
      console.error("Error fetching meals:", e?.message || JSON.stringify(e));
    }
    
    // 9. Fetch Shifts
    try {
      const { data: sh, error: shError } = await supabase.from('employee_shifts').select('*, employees(name)');
      if (shError) throw shError;
      if (sh) setShifts(sh);
    } catch (e: any) {
      console.error("Error fetching shifts:", e?.message || JSON.stringify(e));
    }

    // 10. Fetch Time Records
    try {
      const { data: tr, error: trError } = await supabase.from('employee_time_records').select('*, employees(name)');
      if (trError) throw trError;
      if (tr) setTimeRecords(tr);
    } catch (e: any) {
      console.error("Error fetching time records:", e?.message || JSON.stringify(e));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
        loadInitialData();
    }
  }, [currentUser]);

  // AUTH
  const login = async (username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase.from('app_users').select('*').eq('username', username).eq('password', pass).single();
        if (error || !data) { setIsLoading(false); return false; }
        const user: User = { id: data.id, username: data.username, role: data.role as 'admin' | 'venda' };
        setCurrentUser(user);
        await loadInitialData(user);
        return true;
    } catch (e) { setIsLoading(false); return false; }
  };

  const logout = () => {
      setCurrentUser(null);
      setProducts([]); setSales([]); setExpenses([]); setMovements([]);
  };

  const changePassword = async (userId: string, newPass: string) => {
      setIsLoading(true);
      await supabase.from('app_users').update({ password: newPass }).eq('id', userId);
      setIsLoading(false);
  };

  // USERS
  const addAppUser = async (user: Omit<User, 'id'> & { password?: string }) => {
      setIsLoading(true);
      await supabase.from('app_users').insert({ username: user.username, password: user.password, role: user.role });
      await loadInitialData();
  };
  const updateAppUser = async (user: User & { password?: string }) => {
      setIsLoading(true);
      const updates: any = { role: user.role, username: user.username };
      if (user.password && user.password.trim() !== "") updates.password = user.password;
      await supabase.from('app_users').update(updates).eq('id', user.id);
      await loadInitialData();
  };
  const deleteAppUser = async (userId: string) => {
      setIsLoading(true);
      await supabase.from('app_users').delete().eq('id', userId);
      await loadInitialData();
  };

  const getProductStock = (productId: string): number => {
    return movements
      .filter(m => m.product_id === productId)
      .reduce((acc, curr) => {
        const type = curr.movement_type;
        if (type === MovementType.AJUSTE) return acc + curr.quantity; 
        const isEntry = [
          MovementType.ENTRADA_AJUSTE, MovementType.ENTRADA_COMPRA, 
          MovementType.PRODUCAO, MovementType.ESTORNO_VENDA, MovementType.AJUSTE
        ].includes(type as MovementType);
        if (type === 'Ajuste de Inventário' && curr.quantity < 0) return acc + curr.quantity;
        return isEntry ? acc + curr.quantity : acc - curr.quantity;
      }, 0);
  };

  // --- PRODUCTS (Strict Persistence) ---
  const addProduct = async (product: Omit<Product, 'id' | 'created_at'>): Promise<string | null> => {
    setIsLoading(true);
    // Insert into DB first
    const { data, error } = await supabase.from('products').insert(product).select().single();
    
    if (error) {
        setIsLoading(false);
        console.error("Error adding product to DB:", error);
        throw error; 
    }

    await loadInitialData(); 
    return data?.id || null;
  };

  const updateProduct = async (product: Product) => {
    setIsLoading(true);
    const { id, ...rest } = product;
    const { error } = await supabase.from('products').update(rest).eq('id', id);
    
    if (error) {
        setIsLoading(false);
        console.error("Error updating product:", error);
        throw error;
    }
    
    await loadInitialData();
  };

  const removeProduct = async (productId: string) => {
    setIsLoading(true);
    await supabase.from('products').delete().eq('id', productId);
    await loadInitialData();
  };

  const syncProductsWithSupabase = async () => {
    setIsLoading(true);
    console.log("Starting product sync...");
    
    const { data: dbProducts } = await supabase.from('products').select('id, name');
    const dbIds = new Set(dbProducts?.map(p => p.id) || []);

    let syncCount = 0;

    for (const prod of products) {
        if (!prod.id || !dbIds.has(prod.id)) {
            const { id, created_at, ...prodData } = prod;
            console.log(`Syncing product: ${prod.name}`);
            
            await supabase.from('products').insert(prodData);
            syncCount++;
        }
    }

    console.log(`Sync complete. ${syncCount} products pushed.`);
    await loadInitialData();
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    setIsLoading(true);
    await supabase.from('product_categories').insert({ name: category.name, color: category.color });
    await loadInitialData();
  };
  const updateCategory = async (category: Category) => {
    setIsLoading(true);
    await supabase.from('product_categories').update({ name: category.name, color: category.color }).eq('id', category.id);
    await loadInitialData();
  };
  const removeCategory = async (categoryId: string) => {
    setIsLoading(true);
    await supabase.from('product_categories').delete().eq('id', categoryId);
    await loadInitialData();
  };

  const addMovement = async (movement: Omit<StockMovement, 'id' | 'created_at'>) => {
    setIsLoading(true);
    await supabase.from('stock_movements').insert(movement);
    await loadInitialData();
  };

  const createSale = async (items: any[], paymentMethod: string, discount: number = 0, isEmployeeConsumption: boolean = false) => {
    setIsLoading(true);
    try {
      const grossValue = items.reduce((acc, item) => acc + item.total, 0);
      const totalCost = items.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
      const netValue = grossValue - discount;

      let origin = 'cliente';
      if (isEmployeeConsumption || paymentMethod === PaymentMethod.FUNCIONARIO) {
          origin = 'funcionario';
      }

      const { data: saleData, error: saleError } = await supabase.from('sales').insert({
        channel: 'Balcão',
        status: SaleStatus.FECHADA,
        payment_method: paymentMethod,
        origin: origin,
        gross_value: grossValue,
        discount_value: discount,
        net_value: netValue,
        total_cost: totalCost
      }).select().single();

      if (saleError || !saleData) throw saleError;
      const saleId = saleData.id;

      const saleItemsPayload = items.map(item => ({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_value: item.total,
        unit_cost: item.unitCost
      }));
      await supabase.from('sale_items').insert(saleItemsPayload);

      const movementsPayload = items.map(item => ({
        product_id: item.productId,
        movement_type: origin === 'funcionario' ? MovementType.SAIDA_CONSUMO : MovementType.SAIDA_VENDA,
        quantity: item.quantity,
        origin: `Venda #${saleId.substring(0,6)} (${origin})`
      }));
      await supabase.from('stock_movements').insert(movementsPayload);

      await loadInitialData();
      return saleId;
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      return null;
    }
  };

  const cancelSale = async (saleId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
        await supabase.from('sales').update({ status: SaleStatus.CANCELADA, canceled: true }).eq('id', saleId);
        const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', saleId);
        if (items && items.length > 0) {
            const reversals = items.map(item => ({
                product_id: item.product_id,
                movement_type: MovementType.ESTORNO_VENDA,
                quantity: item.quantity,
                origin: `Estorno Venda #${saleId.substring(0,6)}`,
                notes: 'Venda cancelada pelo usuário'
            }));
            await supabase.from('stock_movements').insert(reversals);
        }
        await loadInitialData();
        return true;
    } catch (error) {
        console.error("Erro ao cancelar venda:", error);
        return false;
    } finally { setIsLoading(false); }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'created_at'>) => {
    setIsLoading(true);
    await supabase.from('expenses').insert(expense);
    await loadInitialData();
  };
  const cancelExpense = async (expenseId: string) => {
    setIsLoading(true);
    await supabase.from('expenses').update({ canceled: true }).eq('id', expenseId);
    await loadInitialData();
  };
  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    setIsLoading(true);
    await supabase.from('employees').insert(employee);
    await loadInitialData();
  };
  const updateEmployee = async (employee: Employee) => {
    setIsLoading(true);
    const { id, ...rest } = employee;
    await supabase.from('employees').update(rest).eq('id', id);
    await loadInitialData();
  };
  const addMealConsumption = async (meal: Omit<MealConsumption, 'id' | 'created_at'>) => {
    setIsLoading(true);
    await supabase.from('employee_meals').insert(meal);
    await loadInitialData();
  };
  const cancelMealConsumption = async (mealId: string) => {
    setIsLoading(true);
    await supabase.from('employee_meals').update({ canceled: true }).eq('id', mealId);
    await loadInitialData();
  };
  const addShift = async (shift: Omit<EmployeeShift, 'id'>) => {
    setIsLoading(true);
    await supabase.from('employee_shifts').insert(shift);
    await loadInitialData();
  };
  const addTimeRecord = async (record: Omit<EmployeeTimeRecord, 'id'>) => {
    setIsLoading(true);
    await supabase.from('employee_time_records').insert(record);
    await loadInitialData();
  };
  const updateTimeRecord = async (id: string, updates: Partial<EmployeeTimeRecord>) => {
    setIsLoading(true);
    await supabase.from('employee_time_records').update(updates).eq('id', id);
    await loadInitialData();
  };
  const generateProductImage = async (productName: string, categoryName: string): Promise<string | null> => {
    if (!process.env.API_KEY) return null;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Gerar imagem ilustrativa de ${productName} da categoria ${categoryName}, em estilo fotográfico, fundo limpo, delicioso, apropriado para cardápio digital de lanchonete.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setIsLoading(false);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      setIsLoading(false); return null;
    } catch (error) { setIsLoading(false); return null; }
  };

  return (
    <StoreContext.Provider value={{
      currentUser, login, logout, changePassword,
      appUsers, addAppUser, updateAppUser, deleteAppUser,
      products, categories, movements, sales, expenses, 
      employees, mealConsumptions, shifts, timeRecords,
      isLoading,
      refreshData: loadInitialData,
      addProduct, updateProduct, removeProduct, syncProductsWithSupabase,
      addCategory, updateCategory, removeCategory,
      addMovement,
      createSale, cancelSale,
      addExpense, cancelExpense,
      addEmployee, updateEmployee,
      addMealConsumption, cancelMealConsumption,
      addShift, addTimeRecord, updateTimeRecord,
      getProductStock, generateProductImage
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
