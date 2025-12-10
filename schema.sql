-- App Users Table
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'inventory', 'hr')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Categories Table
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'un',
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Movements Table
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'pix')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled', 'pending')) DEFAULT 'completed',
  is_employee_consumption BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Items Table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'pix')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees Table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  position TEXT NOT NULL,
  salary DECIMAL(10, 2),
  hire_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Shifts Table
CREATE TABLE employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  shift_name TEXT NOT NULL CHECK (shift_name IN ('morning', 'afternoon', 'night')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Time Records Table
CREATE TABLE employee_time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  break_start TIMESTAMP,
  break_end TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Meals Table
CREATE TABLE employee_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  meal_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_sales_datetime ON sales(sale_datetime);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_employees_active ON employees(active);
CREATE INDEX idx_employee_shifts_employee ON employee_shifts(employee_id);
CREATE INDEX idx_time_records_employee ON employee_time_records(employee_id);
CREATE INDEX idx_employee_meals_employee ON employee_meals(employee_id);
