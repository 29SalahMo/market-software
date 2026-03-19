import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { addSale, adjustStock, listSales, listProducts } from '../memoryStore.js';
import { randomUUID } from 'crypto';

export const salesRouter = Router();

salesRouter.use(requireAuth);

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
});

const saleBodySchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'EWALLET']),
  items: z.array(saleItemSchema).min(1),
});

salesRouter.post('/', (req, res) => {
  const parsed = saleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid sale data', details: parsed.error.flatten() },
    });
    return;
  }

  const tenantId = req.authUser!.tenantId;
  const branchId = req.authUser!.branchId!;
  const cashierId = req.authUser!.id;
  const body = parsed.data;

  const products = listProducts(tenantId);
  const productById = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const items = body.items.map((i) => {
    const product = productById.get(i.productId);
    if (!product) {
      throw new Error(`Product not found: ${i.productId}`);
    }
    const lineBase = i.quantity * i.unitPrice;
    const lineDiscount = i.discount;
    const taxable = lineBase - lineDiscount;
    const lineTax = (taxable * product.taxRate) / 100;
    const lineTotal = taxable + lineTax;

    total += lineBase;
    discountTotal += lineDiscount;
    taxTotal += lineTax;

    return {
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      taxRate: product.taxRate,
      lineTotal,
    };
  });

  const netTotal = total - discountTotal + taxTotal;

  const saleId = randomUUID();
  const sale = addSale({
    id: saleId,
    tenantId,
    branchId,
    cashierId,
    customerId: body.customerId ?? null,
    total,
    discountTotal,
    taxTotal,
    netTotal,
    paymentMethod: body.paymentMethod,
    createdAt: new Date().toISOString(),
    items,
  });

  // Reduce stock for sold items
  for (const item of items) {
    adjustStock({
      tenantId,
      branchId,
      productId: item.productId,
      quantityDelta: -item.quantity,
      reason: 'SALE',
      refType: 'SALE',
      refId: saleId,
    });
  }

  res.status(201).json({ sale });
});

salesRouter.get('/', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const sales = listSales(tenantId);
  res.json({ sales });
});

salesRouter.get('/reports/daily-sales', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const sales = listSales(tenantId);
  const today = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter((s) => s.createdAt.startsWith(today));

  const summary = todaysSales.reduce(
    (acc, s) => {
      acc.totalGross += s.total;
      acc.totalNet += s.netTotal;
      acc.totalTax += s.taxTotal;
      acc.count += 1;
      return acc;
    },
    { totalGross: 0, totalNet: 0, totalTax: 0, count: 0 },
  );

  res.json({ date: today, ...summary });
});

