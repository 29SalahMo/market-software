# Egypt Supermarket Management System (ESMS)

A complete, modern, and secure supermarket management platform tailored for the Egyptian market. Supports small, medium, and large retailers with real-time inventory, POS, loyalty, AI insights, and Egypt-localized features (EGP, VAT, Arabic RTL).

---

## 🎯 Goals

- **Unified platform** for all supermarket operations
- **Scalable** from single-store to multi-branch
- **Secure** by design (JWT, RBAC, audit logs, encryption)
- **Differentiated** with AI predictions, fraud detection, and smart recommendations

---

## 📁 Project Structure

```
market-software/
├── docs/                    # Design & documentation
│   ├── architecture.md      # System architecture & diagram
│   ├── database-schema.md   # ERD & SQL schema
│   ├── api/                 # API documentation
│   ├── security-threat-model.md
│   ├── deployment-plan.md
│   └── wireframes/          # UI/UX references
├── backend/                 # Node.js API (recommended)
├── frontend/                # React app (Arabic/English, RTL)
├── mobile/                  # Owner monitoring app (optional)
├── docker/                  # Docker & compose
└── scripts/                 # Backup, migrations, seeding
```

---

## 🏪 Core Modules

| Module | Description |
|--------|-------------|
| **Inventory** | Real-time stock, expiry alerts, barcode/QR, auto restock |
| **POS & Sales** | Touch-friendly POS, EGP, discounts/coupons, offline sync |
| **Customers** | Profiles, history, loyalty points, SMS/WhatsApp |
| **Suppliers** | Database, POs, invoices, cost comparison |
| **Employees** | RBAC, shifts, activity logging |
| **Accounting** | P&L, VAT reports (Egypt), Excel/PDF export |

---

## 🔐 Security Highlights

- JWT + refresh tokens, bcrypt/Argon2 hashing
- Role-based permissions (Admin, Manager, Cashier)
- Audit logs for critical actions
- Encryption at rest & in transit (TLS)
- Protection: SQL injection, XSS, CSRF
- Automated backup & recovery

---

## 🛠️ Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + TypeScript | Arabic RTL, i18n, component ecosystem |
| Backend | Node.js (Express/Fastify) | Fast, async, rich npm ecosystem |
| Database | PostgreSQL | ACID, JSON, full-text, scaling |
| Cache | Redis | Sessions, rate limit, real-time |
| Auth | JWT + refresh, OAuth2 optional | Stateless API, mobile-friendly |
| Deployment | Docker + AWS/Azure | Reproducible, scalable |

---

## 📱 Egypt Localization

- **UI:** Arabic-first, RTL, dual language (EN/AR)
- **Currency:** EGP everywhere
- **Tax:** VAT-ready, Egyptian invoice format
- **Payments:** Hooks for local gateways (Fawry, PayMob, etc.)

---

## 🚀 Quick Start

```bash
# With Docker
docker-compose up -d

# Or local dev
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

---

## 🌐 Publish For Public Access

The repo includes a root `vercel.json` that deploys **both** the Vite frontend and the Express API on one Vercel project (e.g. [market-software.vercel.app](https://market-software.vercel.app)).

### Vercel deployment (recommended — frontend + API)

1. Import [github.com/29SalahMo/market-software](https://github.com/29SalahMo/market-software) in Vercel.
2. **Root Directory:** leave empty (repo root). Do **not** set it to `frontend` — the root config builds everything.
3. **Framework Preset:** Other (auto-detected from `vercel.json`).
4. **Output Directory:** leave empty (set in `vercel.json` as `frontend/dist`).
5. Add environment variables in Vercel → Settings → Environment Variables:
   - `JWT_SECRET` = a long random secret (32+ characters)
   - `CORS_ORIGIN` = `https://market-software.vercel.app` (your Vercel URL)
6. Deploy. The site serves the React app; `/v1/*` and `/health` route to the serverless API.

**Demo login:** `admin@esms.local` / `Admin@123`

Leave `VITE_API_BASE_URL` unset on Vercel — the frontend calls the API on the same domain via rewrites.

### GitHub Pages (optional mirror)

If GitHub Actions shows **pages build and deployment** failures, switch Pages to the custom workflow:

1. Open **GitHub → Settings → Pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions** (not “Deploy from a branch”)
3. The **Deploy GitHub Pages** workflow builds the Vite app and publishes to `https://29salahmo.github.io/market-software/`
4. GitHub Pages uses the Vercel API (`VITE_API_BASE_URL`) for login and data

The old default Jekyll deploy only published the README and often fails on `deploy-pages` — disable branch-based Pages once Actions is selected.

### Split deployment (optional)

#### Backend on Render

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `JWT_SECRET=<your-strong-secret>`
  - `CORS_ORIGIN=<your-frontend-url>`

#### Frontend only on Vercel

- Root directory: `frontend`
- Framework preset: `Vite`
- Add env var: `VITE_API_BASE_URL=https://<your-backend-domain>`

---

## 📄 Key Documents

- [System Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [API Documentation](docs/api/README.md)
- [Security Threat Model](docs/security-threat-model.md)
- [Deployment Plan](docs/deployment-plan.md)
- [UI Wireframes](docs/wireframes/README.md)

---

*Designed for Egyptian retailers. Built for security, scale, and usability.*
