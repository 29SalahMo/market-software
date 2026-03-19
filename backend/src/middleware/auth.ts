import type express from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: {
      id: string;
      email: string;
      role: string;
      tenantId: string;
      branchId: string | null;
    };
  }
}

export function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      role: string;
      tenant_id: string;
      branch_id: string | null;
    };

    req.authUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenant_id,
      branchId: payload.branch_id,
    };

    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

export function requireRoles(roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
    next();
  };
}

