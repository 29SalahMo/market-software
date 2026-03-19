# Egypt Supermarket Management System — Database Schema

## 1. Design Principles

- **Normalized** for consistency; controlled denormalization for reporting (e.g. materialized views).
- **Audit-friendly:** Timestamps (`created_at`, `updated_at`), optional `deleted_at` for soft delete.
- **Multi-tenant ready:** `branch_id` on operational tables for future multi-branch support.
- **Egypt-specific:** EGP amounts, VAT fields, locale for receipts and invoices.

---

## 2. Entity-Relationship Diagram (Core)

```mermaid
erDiagram
    users ||--o{ refresh_tokens : has
    users }o--|| roles : has
    users ||--o{ shifts : works
    users ||--o{ audit_logs : generates

    roles ||--o{ role_permissions : has
    permissions ||--o{ role_permissions : used_in

    branches ||--o{ products : holds
    branches ||--o{ sales : at
    branches ||--o{ users : employs

    categories ||--o{ products : contains
    products ||--o{ product_stock : has
    products ||--o{ product_barcodes : has

    product_stock ||--o{ stock_movements : tracks
    suppliers ||--o{ purchase_orders : from
    purchase_orders ||--o{ purchase_order_items : contains
    products ||--o{ purchase_order_items : in

    customers ||--o{ sales : makes
    customers ||--o{ loyalty_accounts : has
    sales ||--o{ sale_items : contains
    products ||--o{ sale_items : in
    sales ||--o{ payments : has

    coupons ||--o{ sale_coupons : applied_to
    sales ||--o{ sale_coupons : uses

    users {
        uuid id PK
        string email UK
        string password_hash
        string name_ar
        string name_en
        uuid role_id FK
        uuid branch_id FK
        boolean active
        timestamps
    }

    roles {
        uuid id PK
        string code UK
        string name_ar
        string name_en
    }

    permissions {
        uuid id PK
        string code UK
        string name_ar
        string name_en
    }

    branches {
        uuid id PK
        string name_ar
        string name_en
        string address
        string tax_id
        timestamps
    }

    categories {
        uuid id PK
        uuid parent_id FK
        string name_ar
        string name_en
        string code
        integer sort_order
    }

    products {
        uuid id PK
        uuid category_id FK
        uuid branch_id FK
        string name_ar
        string name_en
        string sku UK
        decimal price_egp
        decimal cost_egp
        decimal vat_rate
        boolean track_expiry
        date expiry_alert_days
        integer min_stock_level
        timestamps
    }

    product_stock {
        uuid id PK
        uuid product_id FK
        uuid branch_id FK
        decimal quantity
        date expiry_date
        string batch_code
        timestamps
    }

    stock_movements {
        uuid id PK
        uuid product_id FK
        uuid branch_id FK
        decimal quantity_delta
        string movement_type
        uuid reference_id
        string reference_type
        uuid user_id FK
        timestamps
    }

    customers {
        uuid id PK
        string phone UK
        string email
        string name_ar
        string name_en
        string whatsapp
        boolean sms_opt_in
        boolean whatsapp_opt_in
        timestamps
    }

    loyalty_accounts {
        uuid id PK
        uuid customer_id FK
        decimal points_balance
        decimal total_earned
        decimal total_redeemed
        timestamps
    }

    sales {
        uuid id PK
        uuid branch_id FK
        uuid cashier_id FK
        uuid customer_id FK
        string receipt_number UK
        decimal subtotal_egp
        decimal discount_egp
        decimal vat_egp
        decimal total_egp
        string status
        string payment_status
        boolean synced_from_offline
        jsonb metadata
        timestamps
    }

    sale_items {
        uuid id PK
        uuid sale_id FK
        uuid product_id FK
        decimal quantity
        decimal unit_price_egp
        decimal discount_egp
        decimal vat_egp
        decimal line_total_egp
    }

    payments {
        uuid id PK
        uuid sale_id FK
        string method
        decimal amount_egp
        string reference
        timestamps
    }

    coupons {
        uuid id PK
        string code UK
        string type
        decimal value
        date valid_from
        date valid_to
        integer use_limit
        integer used_count
        boolean active
    }

    suppliers {
        uuid id PK
        string name_ar
        string name_en
        string contact_phone
        string contact_email
        string tax_id
        string address
        timestamps
    }

    purchase_orders {
        uuid id PK
        uuid supplier_id FK
        uuid branch_id FK
        string po_number UK
        string status
        decimal total_egp
        date order_date
        date expected_date
        uuid created_by FK
        timestamps
    }

    purchase_order_items {
        uuid id PK
        uuid purchase_order_id FK
        uuid product_id FK
        decimal quantity
        decimal unit_cost_egp
        decimal line_total_egp
    }

    shifts {
        uuid id PK
        uuid user_id FK
        uuid branch_id FK
        timestamp started_at
        timestamp ended_at
        decimal opening_cash_egp
        decimal closing_cash_egp
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb old_value
        jsonb new_value
        string ip_address
        timestamp created_at
    }

    expiry_alerts {
        uuid id PK
        uuid product_id FK
        uuid branch_id FK
        date expiry_date
        decimal quantity
        string status
        timestamp notified_at
    }
```

---

## 3. SQL Schema (PostgreSQL)

Core tables only; indexes and constraints are included. Run migrations in order (e.g. via a migration tool).

```sql
-- ============================================
-- EXTENSIONS & SETTINGS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(255),
    name_en VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- BRANCHES (multi-tenant ready)
-- ============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    address TEXT,
    tax_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    role_id UUID NOT NULL REFERENCES roles(id),
    branch_id UUID REFERENCES branches(id),
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_exp ON refresh_tokens(user_id, expires_at) WHERE revoked = false;

-- ============================================
-- AUDIT
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- ============================================
-- CATEGORIES & PRODUCTS
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    code VARCHAR(50),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id),
    branch_id UUID REFERENCES branches(id),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    sku VARCHAR(100) NOT NULL,
    price_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    cost_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 14.00,
    track_expiry BOOLEAN DEFAULT false,
    expiry_alert_days INT DEFAULT 7,
    min_stock_level DECIMAL(18,3) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, sku)
);

CREATE TABLE product_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barcode VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    UNIQUE(barcode)
);

CREATE TABLE product_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id),
    quantity DECIMAL(18,3) NOT NULL DEFAULT 0,
    expiry_date DATE,
    batch_code VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, branch_id, COALESCE(batch_code, ''), COALESCE(expiry_date::TEXT, ''))
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    quantity_delta DECIMAL(18,3) NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- SALE, PURCHASE, ADJUSTMENT, RETURN, TRANSFER
    reference_id UUID,
    reference_type VARCHAR(50),
    user_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_product_branch ON product_stock(product_id, branch_id);
CREATE INDEX idx_stock_expiry ON product_stock(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at);

-- ============================================
-- CUSTOMERS & LOYALTY
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    whatsapp VARCHAR(20),
    sms_opt_in BOOLEAN DEFAULT false,
    whatsapp_opt_in BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
    points_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_earned DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_redeemed DECIMAL(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COUPONS
-- ============================================
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED
    value DECIMAL(18,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    use_limit INT,
    used_count INT NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SALES & PAYMENTS
-- ============================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),
    receipt_number VARCHAR(50) NOT NULL,
    subtotal_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    vat_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, voided, refunded
    payment_status VARCHAR(20) NOT NULL DEFAULT 'paid', -- paid, partial, pending
    synced_from_offline BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sales_receipt ON sales(branch_id, receipt_number);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(18,3) NOT NULL,
    unit_price_egp DECIMAL(18,2) NOT NULL,
    discount_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    vat_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    line_total_egp DECIMAL(18,2) NOT NULL
);

CREATE TABLE sale_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    discount_applied_egp DECIMAL(18,2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL, -- CASH, CARD, MOBILE, etc.
    amount_egp DECIMAL(18,2) NOT NULL,
    reference VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_branch_date ON sales(branch_id, created_at);
CREATE INDEX idx_sales_cashier ON sales(cashier_id, created_at);
CREATE INDEX idx_sales_customer ON sales(customer_id, created_at);

-- ============================================
-- SUPPLIERS & PURCHASE ORDERS
-- ============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    tax_id VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    po_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, partial, received, cancelled
    total_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, po_number)
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(18,3) NOT NULL,
    unit_cost_egp DECIMAL(18,2) NOT NULL,
    line_total_egp DECIMAL(18,2) NOT NULL
);

-- ============================================
-- SHIFTS
-- ============================================
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    opening_cash_egp DECIMAL(18,2) NOT NULL DEFAULT 0,
    closing_cash_egp DECIMAL(18,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shifts_user_date ON shifts(user_id, started_at);

-- ============================================
-- EXPIRY ALERTS (for notifications)
-- ============================================
CREATE TABLE expiry_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    expiry_date DATE NOT NULL,
    quantity DECIMAL(18,3) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, notified, acknowledged
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OFFLINE SYNC QUEUE (optional, for POS)
-- ============================================
CREATE TABLE offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, applied, conflict, failed
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_sync_status ON offline_sync_queue(status, created_at);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
-- Apply similar trigger to roles, branches, categories, products, product_stock, customers, coupons, sales, purchase_orders, shifts (add in migrations).
```

---

## 4. Key Indexes (Summary)

| Table | Index | Purpose |
|-------|--------|---------|
| refresh_tokens | (user_id, expires_at) WHERE revoked = false | Fast lookup for refresh |
| audit_logs | (entity_type, entity_id), (created_at), (user_id) | Audit queries |
| product_stock | (product_id, branch_id), (expiry_date) | Stock & expiry alerts |
| stock_movements | (product_id, created_at) | History & reports |
| sales | (branch_id, receipt_number), (branch_id, created_at) | POS & reporting |
| sale_items | (sale_id) | Receipt details |
| shifts | (user_id, started_at) | Shift reports |

---

## 5. Egypt-Specific Notes

- **EGP:** All money columns use `DECIMAL(18,2)` and suffix `_egp` in name.
- **VAT:** `vat_rate` on products (default 14%); `vat_egp` on sales/sale_items for reporting.
- **Receipt/invoice:** `receipt_number` per branch; format can be `BRANCH-YEAR-SEQ` (e.g. B1-2025-00001).
- **Tax ID:** `branches.tax_id`, `suppliers.tax_id` for official invoices and VAT reports.

---

## 6. Seeding (Roles & Permissions)

```sql
INSERT INTO roles (code, name_ar, name_en) VALUES
('admin', 'مدير النظام', 'Admin'),
('manager', 'مدير فرع', 'Manager'),
('cashier', 'أمين صندوق', 'Cashier');

-- Permissions: define granular permissions (e.g. inventory.view, inventory.edit, sales.create, reports.financial)
-- and map them to roles via role_permissions.
```

Use a proper migration tool (e.g. node-pg-migrate, Knex, TypeORM) in the backend to version and run these scripts.
