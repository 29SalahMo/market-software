import { Router } from 'express';
import { login } from '../controllers/auth.js';

export const authRouter = Router();

/**
 * POST /v1/auth/login
 * Body: { email, password }
 * Returns: { access_token, refresh_token, expires_in, token_type, user }
 */
authRouter.post('/login', login);

// TODO: implement refresh, logout, change-password
// authRouter.post('/refresh', refresh);
// authRouter.post('/logout', logout);
// authRouter.post('/change-password', requireAuth, changePassword);
