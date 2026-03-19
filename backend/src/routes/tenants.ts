import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getBranchesForTenant, getTenantById, getTenantUsers } from '../memoryStore.js';

export const tenantsRouter = Router();

tenantsRouter.use(requireAuth);

tenantsRouter.get('/me', (req, res) => {
  const authUser = req.authUser!;
  const tenant = getTenantById(authUser.tenantId);
  if (!tenant) {
    res.status(404).json({ error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } });
    return;
  }
  const branches = getBranchesForTenant(tenant.id);

  res.json({
    tenant,
    branches,
    user: authUser,
  });
});

tenantsRouter.get('/users', requireRoles(['OWNER', 'MANAGER', 'ADMIN']), (req, res) => {
  const authUser = req.authUser!;
  const users = getTenantUsers(authUser.tenantId).map((u) => ({
    id: u.id,
    email: u.email,
    nameAr: u.nameAr ?? null,
    nameEn: u.nameEn ?? null,
    role: u.role,
    branchId: u.branchId,
    active: u.active,
  }));

  res.json({ users });
});

