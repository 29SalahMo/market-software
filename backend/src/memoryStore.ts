import { randomUUID } from 'crypto';

export type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'ADMIN';

export interface Tenant {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  plan: 'BASIC' | 'PRO';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  nameAr?: string;
  nameEn?: string;
  role: Role;
  branchId: string | null;
  active: boolean;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  parentId?: string | null;
}

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  arabicName?: string;
  barcode?: string;
  categoryId?: string | null;
  unit: string;
  costPrice: number;
  defaultPrice: number;
  taxRate: number;
  isWeighed: boolean;
  isActive: boolean;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  branchId: string;
  cashierId: string;
  customerId?: string | null;
  total: number;
  discountTotal: number;
  taxTotal: number;
  netTotal: number;
  paymentMethod: 'CASH' | 'CARD' | 'EWALLET';
  createdAt: string;
  items: SaleItem[];
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contact?: string;
  phone?: string;
  taxId?: string;
}

export interface StockLevel {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  quantity: number;
  minQuantity: number;
}

export type StockMovementReason = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'WASTAGE';

export interface StockMovement {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  quantityDelta: number;
  reason: StockMovementReason;
  createdAt: string;
  refType?: string;
  refId?: string;
}

interface TenantData {
  tenants: Map<string, Tenant>;
  branches: Map<string, Branch>;
  users: Map<string, User>;
  categories: Map<string, Category>;
  products: Map<string, Product>;
  customers: Map<string, Customer>;
  sales: Map<string, Sale>;
  suppliers: Map<string, Supplier>;
  stockLevels: Map<string, StockLevel>;
  stockMovements: Map<string, StockMovement>;
}

const store: TenantData = {
  tenants: new Map(),
  branches: new Map(),
  users: new Map(),
  categories: new Map(),
  products: new Map(),
  customers: new Map(),
  sales: new Map(),
  suppliers: new Map(),
  stockLevels: new Map(),
  stockMovements: new Map(),
};

export function getTenantById(id: string): Tenant | undefined {
  return store.tenants.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  for (const user of store.users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) return user;
  }
  return undefined;
}

export function getBranchById(id: string): Branch | undefined {
  return store.branches.get(id);
}

export function getBranchesForTenant(tenantId: string): Branch[] {
  return Array.from(store.branches.values()).filter((b) => b.tenantId === tenantId);
}

export function getTenantUsers(tenantId: string): User[] {
  return Array.from(store.users.values()).filter((u) => u.tenantId === tenantId);
}

export function upsertTenant(tenant: Tenant): Tenant {
  store.tenants.set(tenant.id, tenant);
  return tenant;
}

export function upsertBranch(branch: Branch): Branch {
  store.branches.set(branch.id, branch);
  return branch;
}

export function upsertUser(user: User): User {
  store.users.set(user.id, user);
  return user;
}

export function listProducts(tenantId: string): Product[] {
  return Array.from(store.products.values()).filter((p) => p.tenantId === tenantId);
}

export function upsertProduct(product: Product): Product {
  store.products.set(product.id, product);
  return product;
}

export function listCustomers(tenantId: string): Customer[] {
  return Array.from(store.customers.values()).filter((c) => c.tenantId === tenantId);
}

export function upsertCustomer(customer: Customer): Customer {
  store.customers.set(customer.id, customer);
  return customer;
}

export function listSales(tenantId: string): Sale[] {
  return Array.from(store.sales.values()).filter((s) => s.tenantId === tenantId);
}

export function addSale(sale: Sale): Sale {
  store.sales.set(sale.id, sale);
  return sale;
}

export function listSuppliers(tenantId: string): Supplier[] {
  return Array.from(store.suppliers.values()).filter((s) => s.tenantId === tenantId);
}

export function upsertSupplier(supplier: Supplier): Supplier {
  store.suppliers.set(supplier.id, supplier);
  return supplier;
}

export function listStockLevels(tenantId: string): StockLevel[] {
  return Array.from(store.stockLevels.values()).filter((s) => s.tenantId === tenantId);
}

export function getStockLevel(
  tenantId: string,
  branchId: string,
  productId: string,
): StockLevel | undefined {
  for (const level of store.stockLevels.values()) {
    if (level.tenantId === tenantId && level.branchId === branchId && level.productId === productId) {
      return level;
    }
  }
  return undefined;
}

export function upsertStockLevel(level: StockLevel): StockLevel {
  store.stockLevels.set(level.id, level);
  return level;
}

export function addStockMovement(movement: StockMovement): StockMovement {
  store.stockMovements.set(movement.id, movement);
  return movement;
}

export function adjustStock(options: {
  tenantId: string;
  branchId: string;
  productId: string;
  quantityDelta: number;
  reason: StockMovementReason;
  refType?: string;
  refId?: string;
}): StockLevel {
  const existing = getStockLevel(options.tenantId, options.branchId, options.productId);
  const level: StockLevel =
    existing ??
    {
      id: randomUUID(),
      tenantId: options.tenantId,
      branchId: options.branchId,
      productId: options.productId,
      quantity: 0,
      minQuantity: 0,
    };

  level.quantity += options.quantityDelta;
  upsertStockLevel(level);

  addStockMovement({
    id: randomUUID(),
    tenantId: options.tenantId,
    branchId: options.branchId,
    productId: options.productId,
    quantityDelta: options.quantityDelta,
    reason: options.reason,
    createdAt: new Date().toISOString(),
    refType: options.refType,
    refId: options.refId,
  });

  return level;
}

export function listLowStock(tenantId: string): StockLevel[] {
  return listStockLevels(tenantId).filter((s) => s.quantity <= s.minQuantity);
}

export function seedDemoTenant(ownerPasswordHash: string): { tenant: Tenant; branch: Branch; owner: User } {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const ownerId = randomUUID();

  const tenant: Tenant = {
    id: tenantId,
    name: 'Demo Supermarket',
    legalName: 'Demo Supermarket LLC',
    taxId: 'EG-000000000',
    plan: 'PRO',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  const branch: Branch = {
    id: branchId,
    tenantId,
    name: 'Main Branch',
    address: 'Cairo',
    phone: '+20-000-000-0000',
    isActive: true,
  };

  const owner: User = {
    id: ownerId,
    tenantId,
    email: 'admin@esms.local',
    passwordHash: ownerPasswordHash,
    nameAr: 'مالك المتجر',
    nameEn: 'Store Owner',
    role: 'OWNER',
    branchId,
    active: true,
  };

  upsertTenant(tenant);
  upsertBranch(branch);
  upsertUser(owner);

  return { tenant, branch, owner };
}

