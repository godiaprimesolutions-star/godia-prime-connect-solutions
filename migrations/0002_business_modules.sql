-- GODIA PRIME CONNECT SOLUTIONS
-- Migration 0002: Additional Business Modules
-- Does not delete existing tables or records.

PRAGMA foreign_keys = ON;

-- 1. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    location TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name
ON suppliers(name);

CREATE INDEX IF NOT EXISTS idx_suppliers_phone
ON suppliers(phone);


-- 2. PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    reference_number TEXT UNIQUE,
    total REAL NOT NULL DEFAULT 0 CHECK(total >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'received', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier
ON purchases(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchases_status
ON purchases(status);

CREATE INDEX IF NOT EXISTS idx_purchases_created
ON purchases(created_at);


-- 3. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
    line_total REAL NOT NULL CHECK(line_total >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id)
        REFERENCES purchases(id)
        ON DELETE CASCADE,
    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase
ON purchase_items(purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchase_items_product
ON purchase_items(product_id);


-- 4. CUSTOMER ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    order_number TEXT UNIQUE,
    total REAL NOT NULL DEFAULT 0 CHECK(total >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (
            'pending',
            'confirmed',
            'processing',
            'ready',
            'completed',
            'cancelled'
        )),
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK(payment_status IN (
            'unpaid',
            'partial',
            'paid',
            'refunded'
        )),
    delivery_address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer
ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON orders(created_at);


-- 5. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    line_total REAL NOT NULL CHECK(line_total >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,
    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product
ON order_items(product_id);


-- 6. CUSTOMER DEBTS
CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    sale_id INTEGER,
    order_id INTEGER,
    description TEXT,
    amount REAL NOT NULL CHECK(amount >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
    status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK(status IN ('unpaid', 'partial', 'paid', 'cancelled')),
    due_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL,
    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE SET NULL,
    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL,
    CHECK(amount_paid <= amount)
);

CREATE INDEX IF NOT EXISTS idx_debts_customer
ON debts(customer_id);

CREATE INDEX IF NOT EXISTS idx_debts_status
ON debts(status);

CREATE INDEX IF NOT EXISTS idx_debts_due_date
ON debts(due_date);


-- 7. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    sale_id INTEGER,
    order_id INTEGER,
    debt_id INTEGER,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash'
        CHECK(payment_method IN (
            'cash',
            'mpesa',
            'bank',
            'card',
            'other'
        )),
    transaction_reference TEXT,
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL,
    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE SET NULL,
    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL,
    FOREIGN KEY (debt_id)
        REFERENCES debts(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_customer
ON payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_sale
ON payments(sale_id);

CREATE INDEX IF NOT EXISTS idx_payments_order
ON payments(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_debt
ON payments(debt_id);

CREATE INDEX IF NOT EXISTS idx_payments_created
ON payments(created_at);


-- 8. STAFF
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'inactive')),
    salary REAL NOT NULL DEFAULT 0 CHECK(salary >= 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_name
ON staff(full_name);

CREATE INDEX IF NOT EXISTS idx_staff_status
ON staff(status);


-- 9. BUSINESS EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    payment_method TEXT NOT NULL DEFAULT 'cash'
        CHECK(payment_method IN (
            'cash',
            'mpesa',
            'bank',
            'card',
            'other'
        )),
    reference_number TEXT,
    expense_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_category
ON expenses(category);

CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses(expense_date);


-- 10. STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    movement_type TEXT NOT NULL
        CHECK(movement_type IN (
            'opening',
            'purchase',
            'sale',
            'return',
            'adjustment',
            'damage',
            'transfer'
        )),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    reference_type TEXT,
    reference_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
ON stock_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_type
ON stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created
ON stock_movements(created_at);
