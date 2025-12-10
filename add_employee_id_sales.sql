-- Add employee_id to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);
