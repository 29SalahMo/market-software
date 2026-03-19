# Egypt Supermarket Management System — API Documentation

## Overview

REST API for the Egypt Supermarket Management System. All monetary values are in **EGP**. Responses use **JSON**; request/response encoding is **UTF-8**. API is **stateless**; authentication via **JWT** in `Authorization: Bearer <access_token>`.

**Base URL (example):** `https://api.your-supermarket.com/v1`

**Localization:** Use header `Accept-Language: ar` or `en` (default). Response messages and enum labels can be localized.

---

## Authentication

### Login (issue tokens)

```http
POST /auth/login
Content-Type: application/json
```

**Request:**

```json
{
  "email": "cashier@store.com",
  "password": "********"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "email": "cashier@store.com",
    "name_ar": "أحمد",
    "name_en": "Ahmed",
    "role": "cashier",
    "branch_id": "uuid",
    "permissions": ["sales.create", "sales.read", "products.read"]
  }
}
```

**Errors:** `401` invalid credentials; `403` account disabled.

---

### Refresh token

```http
POST /auth/refresh
Content-Type: application/json
```

**Request:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):** Same shape as login (new `access_token`, optional new `refresh_token`, `expires_in`, `user`).

**Errors:** `401` invalid/expired/revoked refresh token.

---

### Logout (revoke refresh token)

```http
POST /auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request (optional body):**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

If body omitted, revoke all refresh tokens for the current user. **Response:** `204 No Content`.

---

### Change password (authenticated)

```http
POST /auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "current_password": "********",
  "new_password": "********"
}
```

**Response:** `204 No Content`. **Errors:** `400` validation; `401` wrong current password.

---

## Common Conventions

- **Pagination:** Query params `page` (1-based) and `limit` (default 20, max 100). Response includes:
  - `data`: array of items
  - `meta`: `{ "page", "limit", "total", "total_pages" }`
- **Filtering:** Optional query params per resource (e.g. `?status=completed&branch_id=uuid`).
- **Sorting:** `sort=field` or `sort=-field` for descending.
- **Errors:** `{ "error": { "code": "...", "message": "...", "details": [] } }` with HTTP status 4xx/5xx.
- **Ids:** All IDs are **UUIDs** unless stated otherwise.

---

## Inventory

### List products

```http
GET /products?page=1&limit=20&category_id=uuid&search=name_or_sku&low_stock=true
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "sku": "SKU-001",
      "name_ar": "أرز بسمتي",
      "name_en": "Basmati Rice",
      "category_id": "uuid",
      "price_egp": 45.00,
      "cost_egp": 32.00,
      "vat_rate": 14.00,
      "track_expiry": true,
      "expiry_alert_days": 7,
      "min_stock_level": 10,
      "stock_quantity": 25.000,
      "barcodes": ["6221043000012"],
      "active": true,
      "created_at": "2025-02-14T10:00:00Z",
      "updated_at": "2025-02-14T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100, "total_pages": 5 }
}
```

**Permission:** `products.read` (or equivalent).

---

### Get product by ID

```http
GET /products/:id
Authorization: Bearer <access_token>
```

**Response (200):** Single product object (same shape as list item, optionally with `stock_by_branch`, `expiry_alerts`).

**Errors:** `404` not found.

---

### Create product

```http
POST /products
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "sku": "SKU-002",
  "name_ar": "زيت طهي",
  "name_en": "Cooking Oil",
  "category_id": "uuid",
  "price_egp": 35.00,
  "cost_egp": 28.00,
  "vat_rate": 14.00,
  "track_expiry": true,
  "expiry_alert_days": 14,
  "min_stock_level": 20,
  "barcodes": ["6221043000029"],
  "branch_id": "uuid"
}
```

**Response (201):** Created product object. **Permission:** `products.create`.

---

### Update product

```http
PATCH /products/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:** Partial product fields. **Response (200):** Updated product. **Permission:** `products.update`.

---

### Get stock (per product/branch)

```http
GET /products/:id/stock?branch_id=uuid
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "product_id": "uuid",
  "branch_id": "uuid",
  "quantity": 50.000,
  "batches": [
    { "batch_code": "B001", "expiry_date": "2025-06-01", "quantity": 30.000 },
    { "batch_code": "B002", "expiry_date": "2025-08-01", "quantity": 20.000 }
  ]
}
```

---

### Adjust stock

```http
POST /products/:id/stock/adjust
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "branch_id": "uuid",
  "quantity_delta": -5.000,
  "movement_type": "ADJUSTMENT",
  "notes": "Damage write-off"
}
```

**Response (200):** Updated stock + movement record. **Permission:** `inventory.update`.

---

### Expiry alerts

```http
GET /inventory/expiry-alerts?branch_id=uuid&days=7
Authorization: Bearer <access_token>
```

**Response (200):** List of products with expiry in the next `days` (default 7), with quantity and expiry date.

---

### Restock suggestions (auto / AI)

```http
GET /inventory/restock-suggestions?branch_id=uuid
Authorization: Bearer <access_token>
```

**Response (200):** List of products at or below `min_stock_level` or suggested quantity based on sales history (if AI module enabled).

---

### Lookup by barcode

```http
GET /products/by-barcode/:barcode?branch_id=uuid
Authorization: Bearer <access_token>
```

**Response (200):** Product object with current stock for branch. **Errors:** `404` barcode not found.

---

## Sales & POS

### Create sale (checkout)

```http
POST /sales
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "branch_id": "uuid",
  "customer_id": "uuid",
  "items": [
    { "product_id": "uuid", "quantity": 2, "unit_price_egp": 45.00 },
    { "product_id": "uuid", "quantity": 1, "unit_price_egp": 35.00 }
  ],
  "coupon_code": "SAVE10",
  "discount_egp": 0,
  "payments": [
    { "method": "CASH", "amount_egp": 125.00 },
    { "method": "CARD", "amount_egp": 0 }
  ],
  "synced_from_offline": false,
  "offline_sale_id": null
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "receipt_number": "B1-2025-00042",
  "subtotal_egp": 125.00,
  "discount_egp": 12.50,
  "vat_egp": 15.75,
  "total_egp": 128.25,
  "status": "completed",
  "payment_status": "paid",
  "items": [...],
  "payments": [...],
  "created_at": "2025-02-14T12:00:00Z"
}
```

**Permission:** `sales.create`. Stock is decremented; loyalty updated if customer linked.

---

### Get sale by ID

```http
GET /sales/:id
Authorization: Bearer <access_token>
```

**Response (200):** Sale with items and payments. **Permission:** `sales.read`.

---

### List sales (with filters)

```http
GET /sales?branch_id=uuid&from=2025-02-01&to=2025-02-14&status=completed&page=1&limit=20
Authorization: Bearer <access_token>
```

**Response (200):** Paginated list of sales. **Permission:** `sales.read`.

---

### Void / refund sale

```http
POST /sales/:id/void
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request (optional):** `{ "reason": "Customer request" }`. **Response (200):** Updated sale (status = voided). Stock and loyalty are reversed. **Permission:** `sales.void`.

---

### Offline sync (submit pending sales)

```http
POST /sales/sync
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "device_id": "pos-device-001",
  "sales": [
    { "offline_sale_id": "local-uuid", "branch_id": "uuid", "customer_id": null, "items": [...], "payments": [...], "created_at_local": "2025-02-14T11:00:00Z" }
  ]
}
```

**Response (200):** `{ "synced": [ { "offline_sale_id": "...", "sale_id": "uuid", "receipt_number": "..." } ], "conflicts": [], "errors": [] }`. **Permission:** `sales.create`.

---

## Customers

### List customers

```http
GET /customers?page=1&limit=20&search=phone_or_name
Authorization: Bearer <access_token>
```

**Response (200):** Paginated list of customers (id, phone, name_ar, name_en, email, loyalty points if present).

---

### Create customer

```http
POST /customers
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "phone": "+201012345678",
  "email": "customer@example.com",
  "name_ar": "محمد",
  "name_en": "Mohamed",
  "whatsapp": "+201012345678",
  "sms_opt_in": true,
  "whatsapp_opt_in": true
}
```

**Response (201):** Created customer + loyalty_account (points_balance = 0).

---

### Get customer (with history & loyalty)

```http
GET /customers/:id
Authorization: Bearer <access_token>
```

**Response (200):** Customer + `loyalty_account` + last N `purchases` (sale id, date, total_egp).

---

### Update loyalty points (manual adjust)

```http
POST /customers/:id/loyalty/adjust
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:** `{ "points_delta": 100, "reason": "Promotion" }`. **Response (200):** Updated loyalty account. **Permission:** `customers.update` or `loyalty.manage`.

---

## Coupons

### Validate coupon

```http
GET /coupons/validate?code=SAVE10
Authorization: Bearer <access_token>
```

**Response (200):** `{ "valid": true, "type": "PERCENTAGE", "value": 10, "message_ar": "...", "message_en": "..." }` or `{ "valid": false, "message_ar": "...", "message_en": "..." }`.

---

### List / create / update coupons

- `GET /coupons` — list (admin).
- `POST /coupons` — create (admin).
- `PATCH /coupons/:id` — update (admin).

Request/response shapes follow the `coupons` table (code, type, value, valid_from, valid_to, use_limit, used_count, active).

---

## Suppliers & Purchase Orders

### Suppliers

- `GET /suppliers` — list (paginated).
- `GET /suppliers/:id` — get one.
- `POST /suppliers` — create.
- `PATCH /suppliers/:id` — update.

**Permission:** `suppliers.read` / `suppliers.create` / `suppliers.update`.

---

### Purchase orders

- `GET /purchase-orders` — list (filters: supplier_id, branch_id, status, from, to).
- `GET /purchase-orders/:id` — get one with items.
- `POST /purchase-orders` — create (draft) with items.
- `PATCH /purchase-orders/:id` — update (e.g. status to sent/received).
- `POST /purchase-orders/:id/receive` — receive PO: update stock, stock_movements, PO status.

**Request (create PO):**

```json
{
  "supplier_id": "uuid",
  "branch_id": "uuid",
  "order_date": "2025-02-14",
  "expected_delivery_date": "2025-02-20",
  "items": [
    { "product_id": "uuid", "quantity": 100, "unit_cost_egp": 32.00 }
  ]
}
```

**Permission:** `purchase_orders.read` / `purchase_orders.create` / `purchase_orders.update`.

---

### Cost comparison (by product)

```http
GET /suppliers/cost-comparison?product_id=uuid
Authorization: Bearer <access_token>
```

**Response (200):** List of suppliers who have supplied this product with last unit_cost_egp and last order date.

---

## Employees & Shifts

### Users (admin)

- `GET /users` — list (branch_id, role, active).
- `GET /users/:id` — get one.
- `POST /users` — create (email, password, name_ar, name_en, role_id, branch_id).
- `PATCH /users/:id` — update (including role, branch, active).
- `POST /users/:id/reset-password` — set new password (admin).

**Permission:** `users.read` / `users.create` / `users.update`.

---

### Shifts

- `POST /shifts/start` — start shift (body: branch_id, opening_cash_egp). **Permission:** `shifts.create`.
- `POST /shifts/:id/end` — end shift (body: closing_cash_egp). **Permission:** `shifts.update`.
- `GET /shifts` — list (user_id, branch_id, from, to). **Permission:** `shifts.read`.

---

### Activity / audit logs

```http
GET /audit-logs?user_id=uuid&entity_type=sale&from=2025-02-01&to=2025-02-14&page=1&limit=50
Authorization: Bearer <access_token>
```

**Response (200):** Paginated audit log entries (action, entity_type, entity_id, old_value, new_value, user_id, ip_address, created_at). **Permission:** `audit.read` (admin/manager).

---

## Accounting & Reports

### Daily / period P&L

```http
GET /reports/profit-loss?branch_id=uuid&from=2025-02-01&to=2025-02-14
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "from": "2025-02-01",
  "to": "2025-02-14",
  "branch_id": "uuid",
  "revenue_egp": 150000.00,
  "cost_of_goods_egp": 90000.00,
  "gross_profit_egp": 60000.00,
  "discounts_egp": 2000.00,
  "vat_collected_egp": 18200.00,
  "net_profit_egp": 39800.00
}
```

**Permission:** `reports.financial`.

---

### VAT report (Egypt)

```http
GET /reports/vat?branch_id=uuid&from=2025-02-01&to=2025-02-14
Authorization: Bearer <access_token>
```

**Response (200):** Summary of VAT collected on sales and VAT on purchases (if tracked), suitable for Egyptian VAT return. **Permission:** `reports.financial`.

---

### Export (Excel / PDF)

```http
POST /reports/export
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**

```json
{
  "report_type": "sales",
  "format": "excel",
  "from": "2025-02-01",
  "to": "2025-02-14",
  "branch_id": "uuid"
}
```

**Response (202):** `{ "job_id": "uuid", "message": "Export queued" }`. Poll `GET /reports/export/:job_id` for status and download URL when ready. **Permission:** `reports.export`.

---

## AI & Smart Features (Optional)

### Sales prediction

```http
GET /ai/sales-prediction?branch_id=uuid&horizon_days=7
Authorization: Bearer <access_token>
```

**Response (200):** Predicted daily/weekly revenue or per-category (structure TBD by ML service). **Permission:** `reports.analytics`.

---

### Product recommendations (e.g. for customer or basket)

```http
GET /ai/recommendations?customer_id=uuid&limit=10
GET /ai/recommendations?product_ids=uuid1,uuid2&limit=10
Authorization: Bearer <access_token>
```

**Response (200):** List of product IDs or product objects. **Permission:** `products.read`.

---

### Fraud / anomaly alerts (admin)

```http
GET /ai/fraud-alerts?branch_id=uuid&from=2025-02-01&to=2025-02-14
Authorization: Bearer <access_token>
```

**Response (200):** List of flagged events (e.g. excessive voids, discount abuse by cashier). **Permission:** `audit.read` or `reports.fraud`.

---

## Security Headers & CORS

- **CORS:** Allow only configured origins (e.g. web app, POS origin).
- **Headers:** Require `Content-Type: application/json` for POST/PATCH; respond with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP as per security threat model.
- **Rate limiting:** Per-IP and per-user (e.g. 100 req/min for auth, 300 req/min for API). Return `429 Too Many Requests` with `Retry-After`.

---

## Versioning

API version in path: `/v1/...`. Breaking changes introduce `/v2/...`; deprecation communicated in advance.
