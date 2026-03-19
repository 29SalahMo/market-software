import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { listCustomers, upsertCustomer } from '../memoryStore.js';
import { randomUUID } from 'crypto';

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get('/', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const customers = listCustomers(tenantId);
  res.json({ customers });
});

const customerBodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});

customersRouter.post('/', (req, res) => {
  const parsed = customerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid customer data', details: parsed.error.flatten() },
    });
    return;
  }
  const tenantId = req.authUser!.tenantId;

  const customer = upsertCustomer({
    id: randomUUID(),
    tenantId,
    name: parsed.data.name,
    phone: parsed.data.phone,
  });

  res.status(201).json({ customer });
});

