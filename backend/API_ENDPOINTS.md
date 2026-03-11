# Vendor Management API Endpoints

**Base URL:** `http://127.0.0.1:8000`

---

## Authentication

For all protected endpoints, add this header:

```
Authorization: Bearer <access_token>
```

---

## 1. Auth Endpoints (`/api/auth/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| POST | `/api/auth/login/` | Login - returns JWT access & refresh tokens | No |
| POST | `/api/auth/token/refresh/` | Refresh expired access token | No |
| GET | `/api/auth/profile/` | Get authenticated user's profile | Yes |

**Login Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Login Response:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

**Token Refresh Request Body:**
```json
{
  "refresh": "eyJ..."
}
```

---

## 2. Dashboard Endpoints (`/api/dashboard/`) — Admin Only

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/dashboard/stats/` | Vendor count, activity count, employee count, payment stats, overdue activities |
| GET | `/api/dashboard/spending-trends/` | 6-month spending trends |
| GET | `/api/dashboard/completion-rates/` | 6-month activity completion rates |

---

## 3. Branches (`/api/branches/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/branches/` | List all branches | Any user |
| POST | `/api/branches/` | Create branch | Admin |
| GET | `/api/branches/{id}/` | Get branch details | Any user |
| PUT | `/api/branches/{id}/` | Update branch | Admin |
| PATCH | `/api/branches/{id}/` | Partially update branch | Admin |
| DELETE | `/api/branches/{id}/` | Delete branch | Admin |

---

## 4. Vendors (`/api/vendors/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/vendors/` | List vendors (filtered by role & branch) | Any user |
| POST | `/api/vendors/` | Create vendor | Admin |
| GET | `/api/vendors/{id}/` | Get vendor details | Any user |
| PUT | `/api/vendors/{id}/` | Update vendor | Admin |
| PATCH | `/api/vendors/{id}/` | Partially update vendor | Admin |
| DELETE | `/api/vendors/{id}/` | Delete vendor | Admin |
| GET | `/api/vendors/by-category/?cat={id}` | Filter vendors by category | Any user |

---

## 5. Employees (`/api/employees/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/employees/` | List employees (filtered by role & branch) | Any user |
| POST | `/api/employees/` | Create employee | Any user |
| GET | `/api/employees/{id}/` | Get employee details | Any user |
| PUT | `/api/employees/{id}/` | Update employee | Any user |
| PATCH | `/api/employees/{id}/` | Partially update employee | Any user |
| DELETE | `/api/employees/{id}/` | Delete employee | Any user |

---

## 6. Categories (`/api/categories/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/categories/` | List all work categories | Any user |
| POST | `/api/categories/` | Create category | Admin |
| GET | `/api/categories/{id}/` | Get category details | Any user |
| PUT | `/api/categories/{id}/` | Update category | Admin |
| PATCH | `/api/categories/{id}/` | Partially update category | Admin |
| DELETE | `/api/categories/{id}/` | Delete category | Admin |

---

## 7. Activities (`/api/activities/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/activities/` | List activities (filtered by role & branch) | Any user |
| POST | `/api/activities/` | Create activity (auto-generates occurrences) | Admin |
| GET | `/api/activities/{id}/` | Get activity details | Any user |
| PUT | `/api/activities/{id}/` | Update activity | Admin |
| PATCH | `/api/activities/{id}/` | Partially update activity | Admin |
| DELETE | `/api/activities/{id}/` | Delete activity | Admin |
| GET | `/api/activities/{id}/occurrences/` | Get all occurrences for an activity | Any user |

---

## 8. Occurrences (`/api/occurrences/`) — Read & Update Only

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/occurrences/` | List activity occurrences | Any user |
| GET | `/api/occurrences/{id}/` | Get occurrence details | Any user |
| PATCH | `/api/occurrences/{id}/` | Update status (mark complete) | Any user |
| GET | `/api/occurrences/today/` | Get today's occurrences | Any user |

> **Note:** No POST or DELETE allowed. Occurrences are auto-generated when activities are created.

---

## 9. Work Logs (`/api/work-logs/`) — List & Create Only

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/work-logs/` | List work logs | Any user |
| GET | `/api/work-logs/?occurrence_id={id}` | Filter logs by occurrence | Any user |
| POST | `/api/work-logs/` | Create work log | Any user |

> **Note:** No PUT, PATCH, or DELETE allowed.

---

## 10. Payments (`/api/payments/`)

| Method | URL | Description | Auth Required |
|--------|-----|-------------|---------------|
| GET | `/api/payments/` | List payments (filtered by role & branch) | Any user |
| GET | `/api/payments/?payment_status=pending` | Filter by payment status | Any user |
| POST | `/api/payments/` | Create payment | Admin |
| GET | `/api/payments/{id}/` | Get payment details | Any user |
| PUT | `/api/payments/{id}/` | Update payment | Admin |
| PATCH | `/api/payments/{id}/` | Partially update payment | Admin |
| DELETE | `/api/payments/{id}/` | Delete payment | Admin |
| POST | `/api/payments/{id}/upload-receipt/` | Upload payment receipt (image/PDF) | Any user |

**Upload Receipt — Postman Setup:**
- **Content-Type:** `multipart/form-data`
- **Body tab** → select **form-data** → key: `receipt`, type: **File**, then choose your file

---

## Role-Based Access Summary

| Role | Access |
|------|--------|
| **Admin (with branch)** | See only their branch's data |
| **Admin (without branch)** | See all data across all branches |
| **Vendor owner** | See only their own vendor and related data |
| **Vendor employee** | See only data related to their vendor |

---

## Postman Setup

1. **Create Environment** → Add variable `base_url` = `http://127.0.0.1:8000`
2. **Login first** → POST to `/api/auth/login/` to get JWT token
3. **Set Authorization** → For all other requests, add header: `Authorization: Bearer <access_token>`
4. **Create superuser** → Run `python manage.py createsuperuser` if no user exists
