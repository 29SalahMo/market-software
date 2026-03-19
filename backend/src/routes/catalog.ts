import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { listProducts, upsertProduct } from '../memoryStore.js';
import { randomUUID } from 'crypto';

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get('/products', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const products = listProducts(tenantId);
  res.json({ products });
});

const productBodySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  arabicName: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().min(1).default('pcs'),
  costPrice: z.number().nonnegative().default(0),
  defaultPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).default(14),
  isWeighed: z.boolean().default(false),
});

catalogRouter.post('/products', requireRoles(['OWNER', 'MANAGER']), (req, res) => {
  const parseResult = productBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid product data', details: parseResult.error.flatten() },
    });
    return;
  }

  const tenantId = req.authUser!.tenantId;
  const body = parseResult.data;

  const product = upsertProduct({
    id: randomUUID(),
    tenantId,
    sku: body.sku,
    name: body.name,
    arabicName: body.arabicName,
    barcode: body.barcode,
    categoryId: null,
    unit: body.unit,
    costPrice: body.costPrice,
    defaultPrice: body.defaultPrice,
    taxRate: body.taxRate,
    isWeighed: body.isWeighed,
    isActive: true,
  });

  res.status(201).json({ product });
});

