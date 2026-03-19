import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { tenantsRouter } from './routes/tenants.js';
import { catalogRouter } from './routes/catalog.js';
import { customersRouter } from './routes/customers.js';
import { salesRouter } from './routes/sales.js';
import { suppliersRouter } from './routes/suppliers.js';
import { inventoryRouter } from './routes/inventory.js';
import { reportsRouter } from './routes/reports.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  credentials: true,
};
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many login attempts' } },
});

app.use(express.json({ limit: '1mb' }));

app.use('/health', healthRouter);
app.use('/v1/auth', authLimiter, authRouter);
app.use('/v1/tenants', tenantsRouter);
app.use('/v1/catalog', catalogRouter);
app.use('/v1/customers', customersRouter);
app.use('/v1/sales', salesRouter);
app.use('/v1/suppliers', suppliersRouter);
app.use('/v1/inventory', inventoryRouter);
app.use('/v1/reports', reportsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

app.listen(PORT, () => {
  console.log(`ESMS API listening on port ${PORT}`);
});
