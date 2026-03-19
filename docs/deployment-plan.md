# Egypt Supermarket Management System — Deployment Plan

## 1. Objectives

- Deploy the ESMS in a **reproducible**, **scalable**, and **secure** manner.
- Support **staging** (pre-production) and **production**.
- Use **Docker** for consistency and **cloud** (AWS or Azure) for hosting.
- Include **backup**, **monitoring**, and **recovery** procedures.

---

## 2. Environment Strategy

| Environment | Purpose | Data | URL example |
|-------------|---------|------|-------------|
| **Development** | Local dev (developers) | Synthetic / copy | localhost |
| **Staging** | UAT, integration, security tests | Anonymized or synthetic | staging.api.your-supermarket.com |
| **Production** | Live business | Real | api.your-supermarket.com |

Secrets and config differ per environment; no production secrets in code or in staging.

---

## 3. Infrastructure Overview (Cloud-Agnostic)

```
                    [Internet]
                         |
                    [DNS / CDN]
                         |
              [Load Balancer (HTTPS)]
                         |
              [WAF - optional but recommended]
                         |
         +---------------+---------------+
         |                               |
    [Web / POS]                    [API Servers]
    (static hosting                    (containers)
     or same LB)                          |
         |                               |
         +---------------+---------------+
                         |
              [Redis - cache/sessions]
                         |
              [PostgreSQL - primary]
                         |
              [PostgreSQL - read replica] (optional)
                         |
              [Object storage - backups, exports]
```

---

## 4. AWS Example Layout

### 4.1 Regions & VPC

- **Region:** e.g. `eu-west-1` or `me-south-1` (Middle East) for lower latency to Egypt.
- **VPC:** One VPC per environment (or separate subnets). Public subnets for LB; private subnets for API, DB, Redis.
- **NAT Gateway** (or NAT instance) in public subnet for outbound from private (e.g. package installs, external APIs).

### 4.2 Components

| Component | AWS Service | Notes |
|-----------|-------------|--------|
| Compute | ECS Fargate or EKS | Run Docker containers; scale by task count |
| Load balancer | ALB | HTTPS listener; TLS cert from ACM |
| WAF | AWS WAF | Rate limit, OWASP rules, optional geo |
| API / Web | ECS tasks or EC2 + Docker | One service for API; optional separate for static web |
| Database | RDS PostgreSQL | Multi-AZ for prod; encrypted at rest (KMS) |
| Cache | ElastiCache Redis | Cluster mode if needed; encryption in transit + at rest |
| Object storage | S3 | Backups (DB dumps), report exports; versioning + lifecycle |
| Secrets | Secrets Manager (or Parameter Store) | DB password, API keys, JWT secret |
| DNS | Route 53 | A/ALIAS to ALB |
| CDN | CloudFront | Optional; for static assets and caching |
| CI/CD | CodePipeline + CodeBuild or GitHub Actions | Build image, run tests, push to ECR, deploy to ECS/EKS |

### 4.3 Example ECS Task Definition (conceptual)

- **Image:** From ECR (e.g. `esms-api:latest` or tag by commit).
- **CPU/Memory:** e.g. 0.5 vCPU, 1 GB for staging; 1 vCPU, 2 GB for prod (tune by load).
- **Env:** No secrets in env; use Secrets Manager injection or IAM role for S3.
- **Logging:** CloudWatch Logs (JSON); log group per service.
- **Health check:** HTTP `GET /health` on container port; ALB target group uses same for health checks.

---

## 5. Azure Example Layout

| Component | Azure Service | Notes |
|-----------|---------------|--------|
| Compute | Container Apps or AKS | Run Docker API; scale by replica count |
| Load balancer | Application Gateway or Front Door | HTTPS, WAF optional |
| Database | Azure Database for PostgreSQL | Flexible server; encryption at rest |
| Cache | Azure Cache for Redis | Standard tier for prod |
| Object storage | Blob Storage | Backups, exports; private container |
| Secrets | Key Vault | DB connection string, JWT secret, API keys |
| DNS | Azure DNS or external | CNAME to App Gateway / Front Door |
| CI/CD | GitHub Actions or Azure DevOps | Build, test, push to ACR, deploy |

Same principles as AWS: private subnet for API and DB, public only for LB and optional bastion.

---

## 6. Docker

### 6.1 Images

- **backend-api:** Node.js app (e.g. Express/Fastify). Dockerfile multi-stage: build → production image with `node:*-alpine`.
- **frontend:** Option A: Build static (e.g. `npm run build`) and serve via nginx image. Option B: Served by same API or separate static hosting (S3 + CloudFront / Blob + CDN).
- **Optional:** Separate image for workers (exports, AI jobs) if not in same process.

### 6.2 Docker Compose (local / dev)

- **Services:** api, postgres, redis, (optional) adminer.
- **Volumes:** Postgres data, Redis data (optional).
- **Networks:** Single bridge network.
- **Env file:** `.env.example` only; `.env` in .gitignore.

Example (conceptual):

```yaml
# docker-compose.yml (simplified)
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://user:pass@postgres:5432/esms
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: esms
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: esms
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
volumes:
  pgdata:
  redisdata:
```

---

## 7. Database Migrations & Seeding

- **Tool:** node-pg-migrate, Knex, TypeORM, or similar.
- **When:** Run migrations on **every deployment** (in CI/CD before or during container start).
- **Order:** Migrations before app start; app fails fast if migration fails.
- **Seeding:** Only for dev/staging (roles, permissions, demo branch, demo user). Never seed production data via same script.
- **Backup before migrate:** In production, take a snapshot or dump before applying migrations (see Backup section).

---

## 8. Backup & Recovery

### 8.1 PostgreSQL

- **Automated:** RDS/Azure managed backups (daily, point-in-time recovery). Retain 7–30 days per policy.
- **Additional:** Weekly or daily dump to S3/Blob (encrypted) with retention (e.g. 90 days). Script in `scripts/backup-db.sh` (or similar) using `pg_dump` and AWS CLI / az copy.
- **Restore:** Document steps: restore from RDS snapshot or from `pg_restore` of dump; verify app connectivity and run migrations if needed.

### 8.2 Redis

- **Persistence:** RDB or AOF enabled (ElastiCache/Azure Redis). Use for session and cache; no critical-only state in Redis if possible.
- **Backup:** Managed service snapshots; optional export for audit (e.g. session list) if required.

### 8.3 Application & Config

- **Code:** In Git; tagged releases.
- **Secrets:** In vault (Secrets Manager / Key Vault); no backup of secrets in plain text; recovery = re-create or restore from vault.

### 8.4 Recovery Time Objective (RTO) / Recovery Point Objective (RPO)

- **RPO:** Target how much data loss is acceptable (e.g. 1 hour → more frequent backups or PITR).
- **RTO:** Target time to restore service (e.g. 4 hours); practice restore in staging periodically.

---

## 9. Monitoring & Alerting

### 9.1 Metrics

- **API:** Request count, latency (p50, p95, p99), error rate (4xx, 5xx) by endpoint or service.
- **Infra:** CPU, memory, disk of API and DB; Redis memory and connections.
- **Business (optional):** Sales count, failed logins, sync conflicts (from app metrics or logs).

### 9.2 Logging

- **Structured logs (JSON):** Request id, user id, endpoint, status, duration. No passwords or tokens.
- **Aggregation:** CloudWatch Logs Insights / Log Analytics; or ELK/Datadog.
- **Retention:** 30–90 days hot; archive to S3/Blob if needed for compliance.

### 9.3 Alerts

- **Critical:** API 5xx rate > threshold; DB down; disk > 85%; certificate expiry.
- **High:** API latency > threshold; failed login spike; Redis memory high.
- **Medium:** Backup failure; migration failure in pipeline.

### 9.4 Uptime (optional)

- External HTTP check on `/health` every 1–5 min; alert on consecutive failures.

---

## 10. CI/CD Pipeline (Conceptual)

1. **On push/PR:** Lint, unit tests, dependency scan (e.g. npm audit). Build Docker image (tag with commit SHA).
2. **On merge to main (or release branch):** Run full test suite; build production image; push to registry (ECR/ACR) with tag `latest` or version.
3. **Deploy staging:** Auto-deploy to staging (e.g. ECS task definition update, or Helm upgrade for EKS). Run smoke tests against staging API.
4. **Deploy production:** Manual approval or automated with approval gate. Update production task definition / Helm; blue-green or rolling update; health checks before switching traffic.
5. **Rollback:** Previous task definition or Helm revision; or revert Git and re-run pipeline.

---

## 11. Deployment Checklist (Production)

- [ ] TLS certificate valid and auto-renew (e.g. ACM, Let’s Encrypt).
- [ ] All secrets from vault; no secrets in image or env in plain text.
- [ ] DB encrypted at rest; backups encrypted.
- [ ] WAF and rate limiting enabled.
- [ ] Security headers (CSP, X-Frame-Options, etc.) configured.
- [ ] CORS restricted to known origins.
- [ ] Migrations run and verified.
- [ ] Health check returns 200 for `/health`.
- [ ] Monitoring and alerts configured and tested.
- [ ] Backup and restore procedure documented and tested.
- [ ] Incident contact and escalation documented.

---

## 12. Scaling (When Needed)

- **API:** Increase task count (horizontal); use ALB/App Gateway.
- **DB:** Add read replica(s) for report and dashboard queries; connection pooling (e.g. PgBouncer).
- **Redis:** Larger instance or cluster mode for high throughput.
- **Queue:** If using Redis for jobs, consider dedicated queue (e.g. SQS, Azure Queue) for very high volume.

This deployment plan should be updated when adding new environments (e.g. DR region) or changing cloud provider.
