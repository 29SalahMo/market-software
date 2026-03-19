import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  adjustStock,
  listLowStock,
  listProducts,
  listStockLevels,
  type StockMovementReason,
} from '../memoryStore.js';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get('/stock', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const levels = listStockLevels(tenantId);
  const products = listProducts(tenantId);
  const productById = new Map(products.map((p) => [p.id, p]));

  const items = levels.map((lvl) => {
    const product = productById.get(lvl.productId);
    return {
      id: lvl.id,
      branchId: lvl.branchId,
      productId: lvl.productId,
      productName: product?.name ?? 'Unknown',
      sku: product?.sku ?? '',
      quantity: lvl.quantity,
      minQuantity: lvl.minQuantity,
    };
  });

  res.json({ stock: items });
});

inventoryRouter.get('/low-stock', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const levels = listLowStock(tenantId);
  const products = listProducts(tenantId);
  const productById = new Map(products.map((p) => [p.id, p]));

  const items = levels.map((lvl) => {
    const product = productById.get(lvl.productId);
    return {
      id: lvl.id,
      branchId: lvl.branchId,
      productId: lvl.productId,
      productName: product?.name ?? 'Unknown',
      sku: product?.sku ?? '',
      quantity: lvl.quantity,
      minQuantity: lvl.minQuantity,
    };
  });

  res.json({ stock: items });
});

const adjustSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  quantityDelta: z.number(),
  reason: z.enum(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'WASTAGE']),
});

inventoryRouter.post('/adjust', requireRoles(['OWNER', 'MANAGER']), (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid stock adjustment', details: parsed.error.flatten() },
    });
    return;
  }
  const tenantId = req.authUser!.tenantId;
  const branchId = parsed.data.branchId ?? req.authUser!.branchId!;

  const level = adjustStock({
    tenantId,
    branchId,
    productId: parsed.data.productId,
    quantityDelta: parsed.data.quantityDelta,
    reason: parsed.data.reason as StockMovementReason,
  });

  res.status(200).json({ stockLevel: level });
});

