
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
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
          .select('*, category:product_categories(name)')
          .order('id', { ascending: true })
          .range(from, from + BATCH_SIZE - 1);

        if (pError) throw pError;

        if (p && p.length > 0) {
          // Map DB structure to App structure
          const mappedProducts = p.map((item: any) => {
            let minStock = 0;
            let pType = 'unit';
            try {
              if (item.description && item.description.startsWith('{')) {
                const meta = JSON.parse(item.description);
                minStock = meta.min_stock || 0;
                pType = meta.type || 'unit';
              }
            } catch (e) { /* ignore parse error */ }

            return {
              ...item,
              category: item.category?.name || 'Geral',
              min_stock: minStock,
              type: pType
            }
          });

          if (from === 0) {
            allProducts = mappedProducts;
          } else {
            allProducts = [...allProducts, ...mappedProducts];
          }
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

    // 4. Fetch Stock Movements (WITH MAPPING)
    try {
      const { data: m, error: mError } = await supabase.from('stock_movements').select('*');
      if (mError) throw mError;
      if (m) {
        const mappedMovements = m.map((mov: any) => {
          let mType = MovementType.AJUSTE;
          if (mov.type === 'entry') mType = MovementType.ENTRADA_COMPRA;
          else if (mov.type === 'exit') mType = MovementType.SAIDA_VENDA;
          else if (mov.type === 'adjustment') mType = MovementType.AJUSTE;

          return {
            ...mov,
            movement_type: mType,
            origin: mov.reason // Map reason -> origin for display
          };
        });
        setMovements(mappedMovements);
      }
    } catch (e: any) {
      console.error("Error fetching movements:", e?.message || JSON.stringify(e));
    }

    // 5. Fetch Sales (WITH MAPPING)
    try {
      const { data: s, error: sError } = await supabase.from('sales').select('*, sale_items(*)').order('sale_datetime', { ascending: false });
      if (sError) throw sError;
      if (s) {
        const mappedSales = s.map((sale: any) => {
          // Map DB Payment to App Payment
          let payMethod = 'Dinheiro';
          const dbPm = (sale.payment_method || '').toLowerCase();
          if (dbPm === 'pix') payMethod = 'Pix';
          else if (dbPm === 'card') payMethod = 'Crédito'; // DB merges card types
          else if (dbPm === 'cash') payMethod = 'Dinheiro';

          // Map Status
          const status = sale.status === 'cancelled' ? SaleStatus.CANCELADA : SaleStatus.FECHADA;

          return {
            ...sale,
            payment_method: payMethod,
            net_value: sale.total, // CRITICAL: Map DB total to App net_value
            gross_value: sale.total + (sale.discount || 0),
            origin: sale.is_employee_consumption ? 'funcionario' : 'cliente',
            status: status,
            total_cost: 0, // Not available in DB sales table
            employee_id: sale.employee_id, // Fetch employee_id
            canceled: sale.status === 'cancelled' // Map status to a boolean 'canceled'
          };
        });
        setSales(mappedSales);
      }
    } catch (e: any) {
      console.error("Error fetching sales:", e?.message || JSON.stringify(e));
    }

    // 6. Fetch Expenses
    try {
      const { data: e, error: eError } = await supabase.from('expenses').select('*');
      if (eError) throw eError;
      if (e) {
        const mappedExpenses = e.map((exp: any) => ({
          ...exp,
          value: exp.amount, // Map DB amount to App value
          canceled: exp.status === 'cancelled', // Map DB status to App canceled
          fixed_or_variable: 'variable' // Default fallback
        }));
        setExpenses(mappedExpenses);
      }
    } catch (e: any) {
      console.error("Error fetching expenses:", e?.message || JSON.stringify(e));
    }

    // 7. Fetch Employees
    try {
      const { data: emp, error: empError } = await supabase.from('employees').select('*'); // Removed .eq('active', true) to prevent empty list if col missing
      if (empError) throw empError;
      if (emp) {
        const mappedEmployees = emp.map((e: any) => ({
          ...e,
          role: e.position, // Map DB position to App role
          daily_meal_limit: e.daily_meal_limit || 0
        }));
        setEmployees(mappedEmployees);
      }
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
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, role')
        .eq('username', username)
        .eq('password', pass)
        .maybeSingle(); // não quebra se não achar

      if (error) {
        console.error('Erro Supabase login:', error);
        alert('Erro ao acessar o banco: ' + error.message);
        return false;
      }

      if (!data) {
        alert('Usuário ou senha inválidos.');
        return false;
      }

      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role as 'admin' | 'venda',
      };

      setCurrentUser(user);
      await loadInitialData(user);
      return true;
    } catch (e: any) {
      console.error('Erro inesperado no login:', e);
      alert('Erro inesperado no login. Veja o console do navegador.');
      return false;
    } finally {
      setIsLoading(false);
    }
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
    const { error } = await supabase.from('app_users').insert({
      username: user.username,
      password: user.password,
      role: user.role
    });

    if (error) {
      console.error("Error creating user:", error);
      alert(`Erro ao criar usuário: ${error.message}`);
    } else {
      await loadInitialData();
      alert("Usuário criado com sucesso!");
    }
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

    // Find category ID from name
    // Se o frontend envia 'category' como nome, precisamos achar o ID para o banco
    const catObj = categories.find(c => c.name === product.category);
    const category_id = catObj ? catObj.id : null;

    if (!category_id) {
      setIsLoading(false);
      console.error("Categoria não encontrada:", product.category);
      alert("Erro: Categoria inválida. Recarregue a página.");
      return null;
    }

    // Prepare payload for DB (snake_case and FKs)
    // Hack: Store min_stock and type in Description since columns don't exist
    const metaPayload = JSON.stringify({
      min_stock: product.min_stock || 0,
      type: product.type || 'unit'
    });

    const dbPayload = {
      name: product.name,
      category_id: category_id, // Map name to ID
      description: metaPayload, // Storing metadata here
      price: product.price,
      cost: product.cost,
      quantity: 0, // Initial stock is 0, handled by movements

      unit: product.unit,
      image_url: product.image_url,
      active: product.active
    };

    // Insert into DB
    const { data, error } = await supabase.from('products').insert(dbPayload).select().single();

    if (error) {
      setIsLoading(false);
      console.error("Erro ao adicionar produto:", error);
      alert("Erro ao salvar produto no banco de dados.");
      throw error;
    }

    await loadInitialData();
    return data?.id || null;
  };

  const updateProduct = async (product: Product) => {
    setIsLoading(true);
    const { id, ...rest } = product;

    const catObj = categories.find(c => c.name === product.category);
    const category_id = catObj ? catObj.id : null;

    // Hack: Store min_stock and type in Description since columns don't exist
    const metaPayload = JSON.stringify({
      min_stock: product.min_stock || 0,
      type: product.type || 'unit'
    });

    const dbPayload = {
      name: product.name,
      category_id: category_id,
      description: metaPayload, // Storing metadata here
      price: product.price,
      cost: product.cost,
      unit: product.unit,
      image_url: product.image_url,
      active: product.active
    };

    const { error } = await supabase.from('products').update(dbPayload).eq('id', id);

    if (error) {
      setIsLoading(false);
      console.error("Erro ao atualizar produto:", error);
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
    console.log("Iniciando sincronização de produtos...");

    const { data: dbProducts } = await supabase.from('products').select('id, name');
    const dbIds = new Set(dbProducts?.map(p => p.id) || []);

    let syncCount = 0;

    for (const prod of products) {
      if (!prod.id || !dbIds.has(prod.id)) {
        const { id, created_at, ...prodData } = prod;
        console.log(`Sincronizando produto: ${prod.name}`);

        await supabase.from('products').insert(prodData);
        syncCount++;
      }
    }

    console.log(`Sincronização completa. ${syncCount} produtos enviados.`);
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

    // Map frontend movement types to DB enum (entry, exit, adjustment)
    let dbType = 'adjustment';
    const mType = movement.movement_type || '';

    if (mType.includes('Entrada') || mType.includes('Produção') || mType.includes('Estorno')) dbType = 'entry';
    else if (mType.includes('Saída')) dbType = 'exit';
    else if (mType.includes('Ajuste') || mType.includes('Inventário')) dbType = 'adjustment';

    const payload = {
      product_id: movement.product_id,
      quantity: movement.quantity,
      type: dbType,
      reason: movement.origin ? `${movement.origin} ${movement.notes ? '- ' + movement.notes : ''}` : movement.notes
    };

    const { error } = await supabase.from('stock_movements').insert(payload);

    if (error) {
      console.error("Erro ao salvar movimento:", error);
      alert(`Erro ao salvar movimento: ${error.message}`);
    }

    await loadInitialData();
  };

  const createSale = async (items: any[], paymentMethod: string, discount: number = 0, isEmployeeConsumption: boolean = false, employeeId?: string) => {
    setIsLoading(true);
    try {
      const grossValue = items.reduce((acc, item) => acc + item.total, 0);
      const netValue = grossValue - discount;

      // MAP TO DB SCHEMA
      const dbPaymentMethod = (() => {
        const m = paymentMethod.toLowerCase();
        if (m.includes('pix')) return 'pix';
        if (m.includes('dinheiro')) return 'cash';
        if (m.includes('débito') || m.includes('crédito') || m.includes('card')) return 'card';
        return 'cash'; // Fallback (incl. Funcionário)
      })();

      const dbStatus = 'completed'; // Schema allows: completed, cancelled, pending

      // Schema: total, discount, payment_method, status, is_employee_consumption
      // Missing in schema: channel, origin, gross_value, net_value, total_cost
      // We map netValue -> total.

      const { data: saleData, error: saleError } = await supabase.from('sales').insert({
        total: netValue,
        discount: discount,
        payment_method: dbPaymentMethod,
        status: dbStatus,
        is_employee_consumption: isEmployeeConsumption || paymentMethod === PaymentMethod.FUNCIONARIO,
        employee_id: employeeId || null
      }).select().single();

      if (saleError || !saleData) throw saleError;
      const saleId = saleData.id;

      const saleItemsPayload = items.map(item => ({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
        // schema sale_items does NOT have unit_cost!
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsPayload);
      if (itemsError) throw itemsError;

      const origin = isEmployeeConsumption || paymentMethod === PaymentMethod.FUNCIONARIO ? 'funcionario' : 'cliente';
      const movementsPayload = items.map(item => ({
        product_id: item.productId,
        type: 'exit',
        quantity: item.quantity,
        reason: `Venda #${saleId.substring(0, 6)} (${origin})`
      }));

      const { error: moveError } = await supabase.from('stock_movements').insert(movementsPayload);
      if (moveError) throw moveError;

      await loadInitialData();
      return saleId;
    } catch (e: any) {
      console.error(e);
      alert(`Erro no banco de dados: ${e.message || JSON.stringify(e)}`);
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
          type: 'entry',
          quantity: item.quantity,
          reason: `Estorno Venda #${saleId.substring(0, 6)} - Cancelada`
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
    try {
      // Map App Expense to DB Schema
      const payload = {
        description: expense.description,
        amount: expense.value, // Map value -> amount
        category: expense.category,
        payment_method: expense.payment_method, // Check DB enum constraints if needed
        status: 'paid', // Default to paid if adding an expense
        expense_date: expense.expense_date
      };

      const { error } = await supabase.from('expenses').insert(payload);
      if (error) throw error;
      await loadInitialData();
    } catch (e: any) {
      console.error("Erro ao adicionar despesa:", e);
      alert("Erro ao salvar despesa: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const cancelExpense = async (expenseId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('expenses').update({ status: 'cancelled' }).eq('id', expenseId);
      if (error) throw error;
      await loadInitialData();
    } catch (e: any) {
      console.error("Erro ao cancelar despesa:", e);
      alert("Erro ao cancelar despesa: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    setIsLoading(true);
    try {
      // DB Schema Mapping:
      // role -> position (required)
      const { role, ...rest } = employee;

      const payload = {
        ...rest,
        active: employee.active !== undefined ? employee.active : true,
        position: role || 'Funcionário' // Map role to position
        // daily_meal_limit is now included in rest, assuming column exists
      };

      const { error } = await supabase.from('employees').insert(payload);
      if (error) {
        console.error("Erro ao adicionar funcionário:", error);
        alert(`Erro ao salvar: ${error.message}`);
      } else {
        alert("Funcionário salvo com sucesso!");
      }
    } catch (e: any) {
      alert(`Erro inesperado: ${e.message}`);
    }
    await loadInitialData();
    setIsLoading(false);
  };

  const updateEmployee = async (employee: Employee) => {
    setIsLoading(true);
    try {
      const { id, role, ...rest } = employee;

      const payload: any = { ...rest };
      if (role) payload.position = role; // Map update

      const { error } = await supabase.from('employees').update(payload).eq('id', id);
      if (error) {
        console.error("Erro ao atualizar funcionário:", error);
        alert(`Erro ao atualizar: ${error.message}`);
      } else {
        alert("Funcionário atualizado!");
      }
    } catch (e: any) {
      alert(`Erro inesperado: ${e.message}`);
    }
    await loadInitialData();
    setIsLoading(false);
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
    setIsLoading(true);
    try {
      // Normalização
      const lowerName = productName.toLowerCase();
      const lowerCat = categoryName.toLowerCase();
      let visualDesc = "";

      // --------- SALGADOS / SNACKS ---------
      if (lowerName.includes("coxinha")) {
        visualDesc = [
          "brazilian chicken Coxinha snack",
          "perfect teardrop shape, pointed on top, wider at the base",
          "crispy deep fried golden breadcrumb crust",
          "whole coxinha centered, maybe one small slice showing the shredded chicken filling",
          "on a small white plate, neutral background",
          "ultra realistic professional food photography",
          "do NOT show round balls, nuggets or random croquettes"
        ].join(", ");
      } else if (lowerName.includes("pastel")) {
        visualDesc = [
          "brazilian Pastel snack",
          "large rectangular thin crispy fried pastry",
          "golden blistered crust with air bubbles",
          "served on a white plate with napkin",
          "studio food photography, appetizing"
        ].join(", ");
      } else if (lowerName.includes("kibe") || lowerName.includes("quibe")) {
        visualDesc = [
          "brazilian Kibe snack",
          "american football shaped fried beef and bulgur croquette",
          "dark brown crispy crust",
          "served on a small plate, maybe with a lemon wedge",
          "close-up professional food photo"
        ].join(", ");
      } else if (lowerName.includes("empada") || lowerName.includes("empadinha")) {
        visualDesc = [
          "brazilian Empada snack",
          "small round baked pot pie",
          "golden flaky crust with slightly domed top",
          "one whole empada and one cut showing creamy filling",
          "on a white plate, bakery style photo"
        ].join(", ");
      } else if (lowerName.includes("esfirra") || lowerName.includes("esfiha")) {
        visualDesc = [
          "brazilian Esfiha snack",
          "small open-faced triangular flatbread with minced meat topping",
          "golden baked dough, rustic look",
          "served on a plate, neutral background"
        ].join(", ");
      } else if (lowerName.includes("enroladinho") || lowerName.includes("salsicha enrolada")) {
        visualDesc = [
          "brazilian Enroladinho de Salsicha",
          "sausage wrapped in baked golden dough",
          "soft bread texture, sliced to show sausage inside",
          "snack-bar style photo"
        ].join(", ");
      } else if (lowerName.includes("pão de queijo") || lowerName.includes("pao de queijo")) {
        visualDesc = [
          "Brazilian Cheese Bread (Pão de Queijo)",
          "small round baked cheese rolls, rustic golden crust",
          "several pieces inside a small bowl or basket",
          "warm and fluffy atmosphere, breakfast feeling"
        ].join(", ");
      } else if (lowerName.includes("salgado") || lowerCat.includes("salgado")) {
        visualDesc = [
          "brazilian bakery savory snack assortment",
          "crispy fried or baked items like coxinha, pastel, kibe",
          "served on a plate, golden crusts, appetizing"
        ].join(", ");

        // --------- LANCHES / SANDUÍCHES ---------
      } else if (
        lowerName.includes("x-bacon") ||
        lowerName.includes("x bacon") ||
        lowerName.includes("x-salada") ||
        lowerName.includes("x salada") ||
        lowerName.includes("x-tudo") ||
        lowerName.includes("cheeseburger") ||
        lowerName.includes("hamburg")
      ) {
        visualDesc = [
          "brazilian snack bar style burger",
          "sesame bun, beef patty, melted cheese",
          "for x-bacon: visible crispy bacon strips",
          "for x-salada: visible lettuce, tomato, cheese",
          "stacked burger, juicy, melty cheese",
          "served on a small plate, neutral background",
          "professional burger photography"
        ].join(", ");
      } else if (lowerName.includes("hot dog") || lowerName.includes("cachorro quente")) {
        visualDesc = [
          "brazilian style hot dog in soft bun",
          "sausage covered with tomato sauce, potato sticks and condiments",
          "served on a paper tray or plate",
          "colorful and appetizing"
        ].join(", ");
      } else if (lowerName.includes("misto") || lowerName.includes("bauru") || lowerName.includes("tostado")) {
        visualDesc = [
          "grilled ham and cheese sandwich",
          "golden toasted bread with melted cheese",
          "cut in half showing filling, served on plate",
          "café / snack bar style photo"
        ].join(", ");

        // --------- BEBIDAS ---------
      } else if (
        lowerName.includes("coca") ||
        lowerName.includes("guaraná") ||
        lowerName.includes("guarana") ||
        lowerName.includes("refrigerante") ||
        lowerCat.includes("bebida") && lowerName.includes("lata")
      ) {
        visualDesc = [
          "cold soft drink soda can or bottle on a table",
          "condensation droplets, ice cubes in a glass beside",
          "refreshing, backlit, professional beverage photography"
        ].join(", ");
      } else if (lowerName.includes("água") || lowerName.includes("agua")) {
        visualDesc = [
          "bottle of mineral water and a clear glass with water",
          "cold with condensation, on a clean table",
          "minimalistic beverage photo"
        ].join(", ");
      } else if (lowerName.includes("suco") || lowerName.includes("juice")) {
        visualDesc = [
          "tall glass of fresh natural fruit juice",
          "vibrant color, maybe orange or tropical mix",
          "ice cubes and slice of fruit on the rim",
          "bright and refreshing look"
        ].join(", ");
      } else if (lowerName.includes("café") || lowerName.includes("cafe") || lowerName.includes("pingado") || lowerName.includes("expresso")) {
        visualDesc = [
          "cup of hot brazilian coffee",
          "steaming espresso or café pingado in a small cup",
          "on a saucer with spoon, bakery counter style"
        ].join(", ");
      } else if (lowerName.includes("capuccino") || lowerName.includes("cappuccino")) {
        visualDesc = [
          "ceramic cup of creamy cappuccino",
          "foam art on top, sprinkled with cocoa or cinnamon",
          "warm café atmosphere"
        ].join(", ");

        // --------- SOBREMESAS / DOCES ---------
      } else if (lowerName.includes("brigadeiro")) {
        visualDesc = [
          "brazilian Brigadeiro candy",
          "small round chocolate fudge ball",
          "covered with chocolate sprinkles",
          "in small paper cups, several pieces on a plate",
          "dessert photography"
        ].join(", ");
      } else if (lowerName.includes("beijinho")) {
        visualDesc = [
          "brazilian Beijinho candy",
          "small round coconut sweet ball with sugar coating",
          "clove on top, in paper cups"
        ].join(", ");
      } else if (lowerName.includes("pudim")) {
        visualDesc = [
          "brazilian Pudim de Leite",
          "ring-shaped flan dessert with caramel top",
          "slice served on plate with caramel sauce dripping",
          "soft texture, glossy surface"
        ].join(", ");
      } else if (lowerName.includes("bolo")) {
        visualDesc = [
          "slice of homemade cake on a plate",
          "soft and fluffy crumb",
          "could be chocolate or vanilla cake with simple icing",
          "cozy dessert photo"
        ].join(", ");
      } else if (lowerName.includes("torta") || lowerName.includes("tarte")) {
        visualDesc = [
          "slice of pie or tart",
          "generous filling, visible layers",
          "served on a plate with fork",
          "dessert photography"
        ].join(", ");
      } else if (lowerName.includes("mousse")) {
        visualDesc = [
          "glass cup of creamy mousse dessert",
          "airy texture, garnish on top",
          "served chilled, dessert-bar style"
        ].join(", ");
      } else if (lowerName.includes("açaí") || lowerName.includes("acai")) {
        visualDesc = [
          "bowl of Brazilian Acai",
          "dark purple thick smoothie",
          "topped with granola and sliced banana",
          "refreshing and energetic look"
        ].join(", ");
      } else if (lowerName.includes("salada de frutas") || lowerName.includes("salada de fruta")) {
        visualDesc = [
          "bowl of fresh fruit salad",
          "colorful mix of sliced fruits",
          "served in a transparent bowl",
          "light and healthy dessert look"
        ].join(", ");

        // --------- PRATOS / MARMITAS / COMBOS ---------
      } else if (lowerName.includes("prato feito") || lowerName.includes("pf") || lowerName.includes("marmita") || lowerName.includes("marmitex")) {
        visualDesc = [
          "brazilian 'prato feito' lunch plate",
          "white rice, brown beans, grilled meat, salad and fries",
          "served on a full plate or takeout box",
          "home style lunch"
        ].join(", ");
      } else if (lowerName.includes("combo")) {
        visualDesc = [
          "fast food combo meal",
          "burger or hot dog with fries and a soft drink",
          "arranged together on a tray",
          "colorful, appetizing menu photo"
        ].join(", ");
      } else if (lowerName.includes("salada") && !lowerName.includes("fruta")) {
        visualDesc = [
          "fresh salad plate",
          "mix of lettuce, tomato, carrot, maybe chicken strips or tuna",
          "served in a bowl, healthy and colorful"
        ].join(", ");

        // --------- FALLBACK POR CATEGORIA ---------
      } else if (lowerCat.includes("lanche")) {
        visualDesc = [
          "brazilian snack bar sandwich or burger",
          "golden bread, melted cheese, stacked layers",
          "served on a plate, appetizing"
        ].join(", ");
      } else if (lowerCat.includes("bebida")) {
        visualDesc = [
          "refreshing drink in glass or bottle",
          "condensation droplets, ice, professional beverage photo"
        ].join(", ");
      } else if (lowerCat.includes("sobremesa") || lowerCat.includes("doce")) {
        visualDesc = [
          "sweet dessert",
          "close-up confectionery photo",
          "beautiful plating, appetizing"
        ].join(", ");
      } else if (lowerCat.includes("insumo")) {
        visualDesc = [
          "ingredient or food supply item for snack bar",
          "simple product photo on neutral background",
          "packaging visible and well lit"
        ].join(", ");

        // --------- FALLBACK GENÉRICO ---------
      } else {
        visualDesc = [
          "snack bar product",
          "delicious food item",
          "professional studio food photography",
          "centered composition, neutral background"
        ].join(", ");
      }

      // Prompt final híbrido: nome em PT + descrição em EN
      const prompt = `
        Ultra realistic professional food photography of brazilian snack bar item "${productName}".
        ${visualDesc}.
        Single subject centered in the frame, no people, no logos, no text.
        High resolution, 8k, sharp focus, soft studio lighting, appetizing, menu photo style.
      `.trim();

      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 10000);

      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&model=flux&seed=${seed}`;

      await new Promise(r => setTimeout(r, 1500)); // só pra dar sensação de processamento

      return url;
    } catch (error) {
      console.error("Erro na Geração IA:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
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
