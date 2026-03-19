import { Request, Response } from 'express';
import { z } from 'zod';
import { getAuthService } from '../services/auth.js';

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() },
    });
    return;
  }

  const auth = getAuthService();
  const result = await auth.login(parsed.data.email, parsed.data.password);

  if (!result) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
    return;
  }

  res.status(200).json({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    expires_in: result.expiresIn,
    token_type: 'Bearer',
    user: result.user,
  });
}
