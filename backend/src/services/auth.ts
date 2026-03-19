import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import {
  getBranchById,
  getTenantById,
  getUserByEmail,
  seedDemoTenant,
  type User,
} from '../memoryStore.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN ?? '7d';

let demoSeeded = false;
let authService: AuthService | null = null;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    nameAr: string | null;
    nameEn: string | null;
    role: string;
    branchId: string | null;
    tenantId: string;
  };
}

async function ensureDemoSeeded(): Promise<void> {
  if (demoSeeded) return;
  const passwordHash = await argon2.hash('Admin@123');
  seedDemoTenant(passwordHash);
  demoSeeded = true;
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    nameAr: user.nameAr ?? null,
    nameEn: user.nameEn ?? null,
    role: user.role,
    branchId: user.branchId,
    tenantId: user.tenantId,
  };
}

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult | null> {
    await ensureDemoSeeded();

    const user = getUserByEmail(email);
    if (!user || !user.active) return null;

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return null;

    const tenant = getTenantById(user.tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') return null;

    const expiresInSec = 15 * 60; // 15 min
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenantId,
        branch_id: user.branchId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, jti: randomUUID(), type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_EXPIRES_IN }
    );

    const publicUser = toPublicUser(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSec,
      user: publicUser,
    };
  }
}

export function getAuthService(): AuthService {
  if (!authService) authService = new AuthService();
  return authService;
}
