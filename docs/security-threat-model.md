# Egypt Supermarket Management System — Security Threat Model

## 1. Scope & Assets

### In scope

- Web application (admin/manager dashboard)
- POS application (including offline capability and sync)
- Mobile app (owner monitoring)
- Backend API and services
- Databases (PostgreSQL), cache (Redis), object storage
- Authentication and authorization
- Payment and financial data (EGP amounts, VAT, customer PII)

### Assets to protect

| Asset | Sensitivity | Impact if compromised |
|-------|-------------|------------------------|
| User credentials (passwords) | Critical | Account takeover, privilege escalation |
| JWT / refresh tokens | High | Session hijack, impersonation |
| Customer PII (phone, name, email) | High | Privacy breach, spam/phishing |
| Sales & financial data | High | Fraud, business intelligence leak |
| Inventory & pricing | Medium | Competitor advantage, stock manipulation |
| Audit logs | High | Tampering hides malicious actions |
| Backup data | High | Same as primary data |

---

## 2. Trust Boundaries

- **Untrusted:** End users (browsers, POS devices, mobile apps), public internet, third-party integrations (SMS/WhatsApp gateways, payment gateways).
- **Trusted:** Backend services, database, Redis, internal network (when deployed in VPC).
- **Boundary:** Load balancer / WAF / API gateway. All requests from untrusted to trusted cross this boundary; enforce authentication, authorization, input validation, and rate limiting here and in the application layer.

---

## 3. Threat Model (STRIDE)

### 3.1 Spoofing (Identity)

| Threat | Mitigation |
|--------|-------------|
| Attacker uses stolen credentials | Strong password policy; Argon2/bcrypt hashing; MFA option for admin/manager |
| Session/token theft | Short-lived JWT (e.g. 15 min); refresh token in httpOnly cookie or secure storage; refresh token rotation; revoke on logout |
| API key / token leakage | No long-lived API keys in frontend; server-side only for server-to-server |
| Impersonation of POS/device | Device registration; device_id in offline sync validated and logged |

**Design decisions:** JWT + refresh tokens; password hashing with Argon2 (or bcrypt); optional MFA for sensitive roles; audit log for login/logout and failed attempts.

---

### 3.2 Tampering (Data integrity)

| Threat | Mitigation |
|--------|-------------|
| Request tampering (e.g. price, quantity) | Server-side validation; never trust client for prices—recompute from product master |
| SQL Injection | Parameterized queries only; ORM/query builder; principle of least privilege for DB user |
| Modification of audit logs | Append-only audit table; restricted DB role for audit writes; optional integrity checks |
| Offline POS data tampering before sync | Validate server-side; checksum or signature per offline sale; flag conflicts for review |
| Man-in-the-middle (MITM) | TLS 1.2+ only; HSTS; certificate pinning in mobile if needed |

**Design decisions:** All monetary and quantity logic on server; parameterized queries everywhere; TLS everywhere; audit log append-only.

---

### 3.3 Repudiation (Non-repudiation)

| Threat | Mitigation |
|--------|-------------|
| User denies performing action | Audit log for critical actions (login, role change, sale void, stock adjust, refund, export) with user_id, timestamp, IP |
| Cashier denies void/refund | Audit log with reason field; manager approval for large voids if policy |
| Admin denies user creation | Audit log for user create/update/disable |

**Design decisions:** Comprehensive audit logging; logs immutable (no update/delete); retention policy defined in deployment/operational runbook.

---

### 3.4 Information Disclosure (Confidentiality)

| Threat | Mitigation |
|--------|-------------|
| Unauthorized access to data | RBAC; permission checks on every API; filter by branch_id where applicable |
| Sensitive data in responses | Don’t return password_hash, internal IDs in URLs if guessable; mask PII in logs |
| XSS (reflect stored) | Output encoding; CSP; avoid eval(); sanitize rich content |
| Data at rest | Encrypt DB (TDE or cloud-managed encryption); encrypt backups; optional field-level encryption for PII with KMS |
| Data in transit | TLS for all connections (API, DB, Redis, S3) |
| Error messages | Generic messages to client; detailed errors only in server logs |
| Directory/configuration exposure | No listing; env vars for secrets; no .env in repo |

**Design decisions:** RBAC per endpoint; HTTPS only; DB encryption at rest; no sensitive data in client-side errors or logs.

---

### 3.5 Denial of Service (Availability)

| Threat | Mitigation |
|--------|-------------|
| Brute force login | Rate limit per IP and per account; lockout or CAPTCHA after N failures |
| API flood | Rate limiting per IP and per user (WAF + app); backoff for 429 |
| Heavy report/export abuse | Queue long jobs; limit concurrent exports; require permission |
| DB overload | Connection pooling; read replicas for reports; cache hot data (Redis) |
| Resource exhaustion (memory/CPU) | Limit request size; timeouts; health checks and auto-restart |

**Design decisions:** Rate limiting at gateway and/or app; queue for exports; connection pooling and caching; health checks in deployment.

---

### 3.6 Elevation of Privilege (Authorization)

| Threat | Mitigation |
|--------|-------------|
| Cashier accesses admin APIs | RBAC; every endpoint checks role/permission; no “admin” by default |
| Horizontal access (other branch data) | Enforce branch_id in queries for multi-branch; filter by user’s branch when role is branch-scoped |
| IDOR (e.g. change user_id in request) | Never trust client for identity; take user from JWT; validate resource ownership/branch |
| Insecure direct object reference | Validate entity id and that current user/branch can access it |

**Design decisions:** Centralized permission middleware; branch-aware queries; identity from token only.

---

## 4. Additional Threats (OWASP & Egypt Context)

### 4.1 OWASP Top 10 (summary)

| Risk | Mitigation |
|------|-------------|
| A01 Broken Access Control | RBAC; branch checks; no default allow |
| A02 Cryptographic Failures | TLS; strong hashing (Argon2/bcrypt); no custom crypto |
| A03 Injection | Parameterized queries; input validation; sanitize for XSS |
| A04 Insecure Design | Threat model (this doc); secure SDLC; least privilege |
| A05 Security Misconfiguration | Hardened images; no default credentials; security headers (CSP, X-Frame-Options, etc.) |
| A06 Vulnerable Components | Dependencies scan (npm audit, Snyk); patch policy |
| A07 Auth/Session Failures | JWT + refresh; secure cookie if used; logout revokes |
| A08 Software/Data Integrity | Signed releases; integrity checks for offline sync |
| A09 Logging/Monitoring | Audit logs; alert on failures and anomalies |
| A10 SSRF | Validate and restrict outbound URLs (e.g. payment callbacks) |

### 4.2 CSRF

- For browser-based web app: CSRF token for state-changing requests; SameSite cookies if using cookie-based refresh.
- API used by POS/mobile with Bearer token is not CSRF-prone (no cookie-based auth for API).

### 4.3 Egypt-Specific

- **Local payment gateways (Fawry, PayMob, etc.):** Use official SDKs; validate webhook signatures; store secrets in vault; do not log card data.
- **SMS/WhatsApp:** Use trusted providers; opt-in only; rate limit notifications; protect API keys.
- **Tax/VAT data:** Treat as sensitive; access only for authorized roles; include in backup encryption and access policies.

---

## 5. Security Requirements Summary

1. **Authentication:** Argon2 or bcrypt for passwords; JWT (short-lived) + refresh tokens (stored in Redis, revocable); optional MFA for admin/manager.
2. **Authorization:** RBAC with permissions per endpoint; branch-scoped data where applicable.
3. **Transport:** TLS 1.2+ only; HSTS; secure cookies if used.
4. **Data:** Encryption at rest (DB, backups); optional field-level for PII; no sensitive data in logs or error responses.
5. **Input/Output:** Parameterized queries; output encoding (XSS); validation and sanitization; request size limits.
6. **Audit:** Log auth events and critical business actions; immutable store; retention and access policy.
7. **Operations:** No default credentials; secrets in vault/env; dependency scanning; rate limiting; health checks.

---

## 6. Security Testing Recommendations

- **SAST:** Run in CI (e.g. ESLint security plugins, Semgrep).
- **DAST:** Periodic scans of staging/API (e.g. OWASP ZAP).
- **Dependency scan:** `npm audit`, Snyk, or Dependabot.
- **Penetration test:** Before go-live and after major changes.
- **Auth testing:** Test role boundaries, token expiry, refresh revocation, brute force protection.

---

## 7. Incident Response (High Level)

1. **Detect:** Monitoring and alerts on auth failures, permission errors, anomaly (e.g. fraud alerts).
2. **Contain:** Revoke compromised tokens/users; block IP if needed; scale or isolate affected service.
3. **Eradicate:** Patch vulnerability; rotate secrets; fix misconfiguration.
4. **Recover:** Restore from clean backup if needed; re-enable users after password reset.
5. **Lessons learned:** Update threat model and controls; document and share.

This threat model should be revisited when adding new integrations (e.g. new payment gateway, new SMS provider) or when moving to microservices.
