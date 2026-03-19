import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { listSuppliers, upsertSupplier } from '../memoryStore.js';
import { randomUUID } from 'crypto';

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth);

suppliersRouter.get('/', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const suppliers = listSuppliers(tenantId);
  res.json({ suppliers });
});

const supplierBodySchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
});

suppliersRouter.post('/', requireRoles(['OWNER', 'MANAGER']), (req, res) => {
  const parsed = supplierBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier data', details: parsed.error.flatten() },
    });
    return;
  }
  const tenantId = req.authUser!.tenantId;

  const supplier = upsertSupplier({
    id: randomUUID(),
    tenantId,
    name: parsed.data.name,
    contact: parsed.data.contact,
    phone: parsed.data.phone,
    taxId: parsed.data.taxId,
  });

  res.status(201).json({ supplier });
});

