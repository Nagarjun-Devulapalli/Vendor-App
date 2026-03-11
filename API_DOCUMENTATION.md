# Vendor Management System — API Documentation

> **Base URL:** `http://<host>:<port>/api/`
>
> **Auth:** All endpoints (except Login) require JWT token in the header:
> ```
> Authorization: Bearer <access_token>
> ```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Branches](#2-branches)
3. [Categories](#3-categories)
4. [Vendors](#4-vendors)
5. [Employees](#5-employees)
6. [Activities](#6-activities)
7. [Activity Occurrences](#7-activity-occurrences)
8. [Work Logs](#8-work-logs)
9. [Payments](#9-payments)
10. [Dashboard](#10-dashboard)

---

## 1. Authentication

### 1.1 Login
```
POST /api/auth/login/
```
**When to use:** User login — returns JWT tokens and user info.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1...",
  "refresh": "eyJ0eXAiOiJKV1...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe",
    "role": "admin",
    "branch": 1,
    "branch_name": "Hyderabad Branch",
    "phone": "9876543210"
  }
}
```

**Error (400):**
```json
{
  "non_field_errors": ["Invalid credentials"]
}
```

---

### 1.2 Refresh Token
```
POST /api/auth/token/refresh/
```
**When to use:** When the access token expires, use the refresh token to get a new access token.

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1..."
}
```

**Response (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1..."
}
```

---

### 1.3 Get Profile
```
GET /api/auth/profile/
```
**When to use:** Fetch the logged-in user's profile details.

**Response (200):**
```json
{
  "id": 1,
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "vendor_owner",
  "branch": 1,
  "branch_name": "Hyderabad Branch",
  "phone": "9876543210",
  "aadhar_number": "123456789012",
  "photo": "/media/user_photos/john.jpg",
  "vendor_id": 5
}
```

> **Note:** `vendor_id` is returned for `vendor_owner` and `vendor_employee` roles. It is `null` for admin users.

---

## 2. Branches

### 2.1 List All Branches
```
GET /api/branches/
```
**When to use:** Populate branch dropdown in forms.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Hyderabad Branch",
    "address": "123 Main St, Hyderabad",
    "city": "Hyderabad",
    "created_at": "2026-01-15T10:30:00Z"
  }
]
```

---

### 2.2 Create Branch
```
POST /api/branches/
```
**Permission:** Admin only

**Request Body:**
```json
{
  "name": "Bangalore Branch",
  "address": "456 MG Road, Bangalore",
  "city": "Bangalore"
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Bangalore Branch",
  "address": "456 MG Road, Bangalore",
  "city": "Bangalore",
  "created_at": "2026-03-11T10:00:00Z"
}
```

---

### 2.3 Get / Update / Delete Branch
```
GET    /api/branches/{id}/
PUT    /api/branches/{id}/
PATCH  /api/branches/{id}/
DELETE /api/branches/{id}/
```
**Permission:** Admin only (for write operations)

---

## 3. Categories

### 3.1 List All Categories
```
GET /api/categories/
```
**When to use:** Populate category dropdown when creating activities or vendors.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Housekeeping",
    "description": "Cleaning and maintenance services",
    "created_at": "2026-01-10T08:00:00Z"
  },
  {
    "id": 2,
    "name": "Security",
    "description": "Security guard services",
    "created_at": "2026-01-10T08:00:00Z"
  }
]
```

---

### 3.2 Create Category
```
POST /api/categories/
```
**Permission:** Admin only

**Request Body:**
```json
{
  "name": "Plumbing",
  "description": "Plumbing and water services"
}
```

**Response (201):**
```json
{
  "id": 3,
  "name": "Plumbing",
  "description": "Plumbing and water services",
  "created_at": "2026-03-11T10:00:00Z"
}
```

---

### 3.3 Get / Update / Delete Category
```
GET    /api/categories/{id}/
PUT    /api/categories/{id}/
PATCH  /api/categories/{id}/
DELETE /api/categories/{id}/
```
**Permission:** Admin only (for write operations)

---

## 4. Vendors

### 4.1 List Vendors
```
GET /api/vendors/
```
**When to use:** Show all vendors. Results are auto-filtered by role:
- **Admin:** sees vendors in their branch
- **Vendor Owner:** sees only their own vendor profile

**Query Params:**
| Param | Description |
|-------|-------------|
| `vendor` | Filter by vendor ID |

**Response (200):**
```json
[
  {
    "id": 1,
    "user": {
      "id": 3,
      "username": "vendor_ram",
      "first_name": "Ram",
      "last_name": "Kumar",
      "email": "",
      "role": "vendor_owner",
      "branch": 1,
      "branch_name": "Hyderabad Branch",
      "phone": "9876543210",
      "aadhar_number": "111122223333",
      "photo": null
    },
    "branch": 1,
    "branch_name": "Hyderabad Branch",
    "company_name": "Ram Cleaning Services",
    "display_name": "Ram Cleaning Services",
    "categories": [1, 2],
    "category_names": ["Housekeeping", "Security"],
    "created_at": "2026-01-20T09:00:00Z"
  }
]
```

---

### 4.2 Create Vendor
```
POST /api/vendors/
```
**Permission:** Admin only
**When to use:** Register a new vendor. This automatically creates a User account with `vendor_owner` role.

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | Vendor's first name |
| `last_name` | string | Yes | Vendor's last name |
| `phone` | string | Yes | Phone number (used to generate username) |
| `aadhar_number` | string | No | Aadhar ID number |
| `photo` | file | No | Profile photo |
| `branch` | integer | Yes | Branch ID |
| `company_name` | string | No | Company name |
| `category_ids` | array | No | List of category IDs, e.g. `[1, 2]` |

**Response (201):**
```json
{
  "id": 1,
  "user": {
    "id": 3,
    "username": "9876543210",
    "first_name": "Ram",
    "last_name": "Kumar",
    "role": "vendor_owner",
    "phone": "9876543210"
  },
  "branch": 1,
  "company_name": "Ram Cleaning Services",
  "categories": [1, 2],
  "created_at": "2026-01-20T09:00:00Z",
  "credentials": {
    "username": "9876543210",
    "password": "aB3xK9mP"
  }
}
```

> **Important:** The `credentials` object with the auto-generated username and password is only returned on creation. Save/share it with the vendor immediately.

---

### 4.3 Get Vendors by Category
```
GET /api/vendors/by-category/?cat={category_id}
```
**When to use:** Find vendors that belong to a specific work category.

**Query Params:**
| Param | Required | Description |
|-------|----------|-------------|
| `cat` | Yes | Category ID |

**Response (200):**
```json
[
  {
    "id": 1,
    "display_name": "Ram Cleaning Services",
    "company_name": "Ram Cleaning Services",
    "category_names": ["Housekeeping", "Security"]
  }
]
```

---

### 4.4 Activate / Deactivate Vendor
```
PATCH /api/vendors/{id}/toggle-active/
```
**Permission:** Admin only
**When to use:** Deactivate a vendor and all their employees, or reactivate them. Deactivated users cannot log in.

**Request Body (Deactivate):**
```json
{
  "is_active": false
}
```

**Response (200):**
```json
{
  "message": "Vendor Kumar Facility Services and 2 employees deactivated",
  "is_active": false,
  "employees_affected": 2
}
```

**Request Body (Reactivate):**
```json
{
  "is_active": true
}
```

**Response (200):**
```json
{
  "message": "Vendor Kumar Facility Services and 2 employees activated",
  "is_active": true,
  "employees_affected": 2
}
```

**Error (400):**
```json
{
  "error": "is_active field is required"
}
```

> **Note:** When a vendor is deactivated, ALL employees under that vendor are also deactivated automatically. Same applies for reactivation. The `is_active` field is now included in the vendor list/detail API response.

---

### 4.5 Update Vendor Details
```
PATCH /api/vendors/{id}/
```
**Permission:** Admin only
**When to use:** Edit vendor owner's personal details, company name, or categories.

**Request Body (multipart/form-data) — all fields optional:**
| Field | Type | Description |
|-------|------|-------------|
| `first_name` | string | Owner's first name |
| `last_name` | string | Owner's last name |
| `phone` | string | Phone number |
| `aadhar_number` | string | Aadhar ID number |
| `photo` | file | Profile photo |
| `company_name` | string | Company name |
| `branch` | integer | Branch ID |
| `category_ids` | array | Category IDs, e.g. `[1, 2]` |

**Response (200):**
```json
{
  "id": 1,
  "user": {
    "id": 3,
    "username": "vendor_9888703874",
    "first_name": "Ramesh",
    "last_name": "Kumar",
    "role": "vendor_owner",
    "phone": "9888703874",
    "aadhar_number": "111122223333",
    "photo": "https://storage.googleapis.com/..."
  },
  "branch": 1,
  "company_name": "Kumar Facility Services",
  "display_name": "Kumar Facility Services",
  "categories": [1, 2],
  "category_names": ["Facility Maintenance", "Infrastructure Repair"],
  "is_active": true,
  "created_at": "2026-01-20T09:00:00Z"
}
```

> **Note:** Send only the fields you want to update. User-level fields (name, phone, aadhar, photo) are updated on the linked User model.

---

### 4.6 Delete Vendor
```
DELETE /api/vendors/{id}/
```
**Permission:** Admin only

---

## 5. Employees

### 5.1 List Employees
```
GET /api/employees/
```
**When to use:** Show employees. Results are auto-filtered by role:
- **Admin:** sees employees in their branch
- **Vendor Owner:** sees only their own employees
- **Vendor Employee:** sees only themselves

**Query Params:**
| Param | Description |
|-------|-------------|
| `vendor_owner` | Filter by vendor ID |

**Response (200):**
```json
[
  {
    "id": 1,
    "user": {
      "id": 5,
      "username": "8765432109",
      "first_name": "Suresh",
      "last_name": "Reddy",
      "email": "",
      "role": "vendor_employee",
      "branch": 1,
      "branch_name": "Hyderabad Branch",
      "phone": "8765432109",
      "aadhar_number": "444455556666",
      "photo": null
    },
    "vendor_owner": 1,
    "created_at": "2026-02-01T10:00:00Z"
  }
]
```

---

### 5.2 Create Employee
```
POST /api/employees/
```
**Permission:** Authenticated users
**When to use:** Add a new employee under a vendor. This automatically creates a User account with `vendor_employee` role.

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | Employee's first name |
| `last_name` | string | Yes | Employee's last name |
| `phone` | string | Yes | Phone number (used to generate username) |
| `aadhar_number` | string | No | Aadhar ID number |
| `photo` | file | No | Profile photo |
| `vendor_owner` | integer | Yes | Vendor ID the employee belongs to |

**Response (201):**
```json
{
  "id": 1,
  "user": {
    "id": 5,
    "username": "8765432109",
    "first_name": "Suresh",
    "last_name": "Reddy",
    "role": "vendor_employee",
    "phone": "8765432109"
  },
  "vendor_owner": 1,
  "created_at": "2026-02-01T10:00:00Z",
  "credentials": {
    "username": "8765432109",
    "password": "xY7pQ2nR"
  }
}
```

> **Important:** The `credentials` object is only returned on creation. Share with the employee immediately.

---

### 5.3 Update Employee Details
```
PATCH /api/employees/{id}/
```
**Permission:** Authenticated users
**When to use:** Edit an employee's personal details.

**Request Body (multipart/form-data) — all fields optional:**
| Field | Type | Description |
|-------|------|-------------|
| `first_name` | string | Employee's first name |
| `last_name` | string | Employee's last name |
| `phone` | string | Phone number |
| `aadhar_number` | string | Aadhar ID number |
| `photo` | file | Profile photo |
| `vendor_owner` | integer | Change vendor assignment |

**Response (200):**
```json
{
  "id": 1,
  "user": {
    "id": 5,
    "username": "emp_9781453723",
    "first_name": "Arun",
    "last_name": "Kumar",
    "role": "vendor_employee",
    "phone": "9781453723",
    "aadhar_number": "444455556666",
    "photo": "https://storage.googleapis.com/..."
  },
  "vendor_owner": 1,
  "is_active": true,
  "created_at": "2026-02-01T10:00:00Z"
}
```

> **Note:** Send only the fields you want to update. User-level fields (name, phone, aadhar, photo) are updated on the linked User model.

---

### 5.4 Activate / Deactivate Employee
```
PATCH /api/employees/{id}/toggle-active/
```
**Permission:** Admin or Vendor owner (only their own employees)
**When to use:** Vendor owner deactivates/activates an employee. Deactivated employees cannot log in.

**Request Body (Deactivate):**
```json
{
  "is_active": false
}
```

**Response (200):**
```json
{
  "message": "Employee Arun Kumar deactivated",
  "is_active": false
}
```

**Request Body (Reactivate):**
```json
{
  "is_active": true
}
```

**Response (200):**
```json
{
  "message": "Employee Arun Kumar activated",
  "is_active": true
}
```

**Error (403):**
```json
{
  "error": "You can only manage your own employees"
}
```

> **Note:** The `is_active` field is included in the employee list/detail API response.

---

### 5.5 Delete Employee
```
DELETE /api/employees/{id}/
```

---

## 6. Activities

### 6.1 List Activities
```
GET /api/activities/
```
**When to use:** Show all activities/jobs. Results are auto-filtered by role:
- **Admin:** sees activities in their branch
- **Vendor Owner:** sees activities assigned to them
- **Vendor Employee:** sees activities of their vendor

**Query Params:**
| Param | Description | Example |
|-------|-------------|---------|
| `vendor` | Filter by vendor ID | `?vendor=1` |
| `status` | Filter by status | `?status=pending` |
| `activity_type` | Filter by type | `?activity_type=recurring` |

**Response (200):**
```json
[
  {
    "id": 1,
    "branch": 1,
    "vendor": 1,
    "vendor_name": "Ram Cleaning Services",
    "category": 1,
    "category_name": "Housekeeping",
    "title": "Daily Office Cleaning",
    "description": "Clean all floors and restrooms",
    "activity_type": "recurring",
    "start_date": "2026-03-01",
    "end_date": "2026-03-31",
    "recurrence_interval_days": 1,
    "expected_cost": "15000.00",
    "payment_type": "contract",
    "status": "in_progress",
    "is_overdue": false,
    "occurrence_count": 31,
    "created_at": "2026-02-28T10:00:00Z"
  }
]
```

---

### 6.2 Create Activity
```
POST /api/activities/
```
**Permission:** Admin only
**When to use:** Create a new job/activity and assign it to a vendor. Occurrences are auto-generated based on type.

**Request Body:**
```json
{
  "vendor": 1,
  "category": 1,
  "title": "Daily Office Cleaning",
  "description": "Clean all floors and restrooms",
  "activity_type": "recurring",
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "recurrence_interval_days": 1,
  "expected_cost": "15000.00",
  "payment_type": "contract",
  "status": "pending"
}
```

**Activity Type Values:**
| Value | Description | Required Fields |
|-------|-------------|-----------------|
| `one_time` | Single occurrence on start_date | `start_date` |
| `long_term` | Daily occurrences from start to end | `start_date`, `end_date` |
| `recurring` | Repeated at interval | `start_date`, `end_date`, `recurrence_interval_days` |

**Payment Type Values:** `hourly`, `daily`, `contract`

**Status Values:** `pending`, `in_progress`, `completed`, `cancelled`

**Response (201):**
```json
{
  "id": 1,
  "branch": 1,
  "vendor": 1,
  "vendor_name": "Ram Cleaning Services",
  "category": 1,
  "category_name": "Housekeeping",
  "title": "Daily Office Cleaning",
  "description": "Clean all floors and restrooms",
  "activity_type": "recurring",
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "recurrence_interval_days": 1,
  "expected_cost": "15000.00",
  "payment_type": "contract",
  "status": "pending",
  "is_overdue": false,
  "occurrence_count": 31,
  "created_at": "2026-03-01T10:00:00Z"
}
```

> **Note:** `branch` is auto-set from the admin's branch. Occurrences are auto-generated after creation.

---

### 6.3 Get Activity Occurrences
```
GET /api/activities/{id}/occurrences/
```
**When to use:** View all occurrences (scheduled tasks) for a specific activity, along with their work logs.

**Response (200):**
```json
[
  {
    "id": 1,
    "activity": 1,
    "activity_title": "Daily Office Cleaning",
    "category_name": "Housekeeping",
    "description": "Clean all floors and restrooms",
    "scheduled_date": "2026-03-01",
    "status": "completed",
    "completed_by": 5,
    "completed_by_name": "Suresh Reddy",
    "completed_at": "2026-03-01T14:30:00Z",
    "work_logs": [
      {
        "id": 1,
        "occurrence": 1,
        "user": 5,
        "user_name": "Suresh Reddy",
        "before_photo": "/media/work_logs/before/photo1.jpg",
        "before_photo_taken_at": "2026-03-01T09:00:00Z",
        "after_photo": "/media/work_logs/after/photo2.jpg",
        "after_photo_taken_at": "2026-03-01T14:30:00Z",
        "status": "completed",
        "description": "Cleaned all 3 floors",
        "approval_status": "approved",
        "rejection_reason": null,
        "reviewed_by": 1,
        "reviewed_by_name": "Admin User",
        "reviewed_at": "2026-03-01T15:00:00Z",
        "created_at": "2026-03-01T09:00:00Z"
      }
    ],
    "work_log_count": 1
  }
]
```

---

### 6.4 Get / Update / Delete Activity
```
GET    /api/activities/{id}/
PUT    /api/activities/{id}/
PATCH  /api/activities/{id}/
DELETE /api/activities/{id}/
```
**Permission:** Admin only (for write operations)

---

## 7. Activity Occurrences

### 7.1 List Occurrences
```
GET /api/occurrences/
```
**When to use:** View all occurrences across activities. Auto-filtered by user role.

**Response (200):**
```json
[
  {
    "id": 1,
    "activity": 1,
    "activity_title": "Daily Office Cleaning",
    "category_name": "Housekeeping",
    "description": "Clean all floors and restrooms",
    "scheduled_date": "2026-03-11",
    "status": "pending",
    "completed_by": null,
    "completed_by_name": null,
    "completed_at": null,
    "work_logs": [],
    "work_log_count": 0
  }
]
```

---

### 7.2 Get Today's Occurrences
```
GET /api/occurrences/today/
```
**When to use:** Show tasks scheduled for today on the employee/vendor dashboard.

**Response (200):** Same format as List Occurrences, filtered to today's date.

---

### 7.3 Update Occurrence Status
```
PATCH /api/occurrences/{id}/
```
**When to use:** Manually update an occurrence's status (e.g., mark as missed).

**Request Body:**
```json
{
  "status": "completed"
}
```

**Status Values:** `pending`, `in_progress`, `completed`, `missed`

> **Note:** When status is set to `completed`, `completed_by` and `completed_at` are auto-set to the current user and timestamp.

---

## 8. Work Logs

### 8.1 List Work Logs
```
GET /api/work-logs/
```
**When to use:** View work logs, optionally filtered by occurrence.

**Query Params:**
| Param | Description |
|-------|-------------|
| `occurrence` | Filter by occurrence ID |

**Response (200):**
```json
[
  {
    "id": 1,
    "occurrence": 1,
    "user": 5,
    "user_name": "Suresh Reddy",
    "before_photo": "/media/work_logs/before/photo1.jpg",
    "before_photo_taken_at": "2026-03-11T09:00:00Z",
    "after_photo": null,
    "after_photo_taken_at": null,
    "status": "in_progress",
    "description": "Starting cleaning",
    "approval_status": "pending",
    "rejection_reason": null,
    "reviewed_by": null,
    "reviewed_by_name": null,
    "reviewed_at": null,
    "created_at": "2026-03-11T09:00:00Z"
  }
]
```

---

### 8.2 Create Work Log (Start Work)
```
POST /api/work-logs/
```
**When to use:** Employee starts working on an occurrence. This is the "check-in" step.

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `occurrence` | integer | Yes | Occurrence ID |
| `before_photo` | file | No | Photo before starting work |
| `description` | string | No | Description of work to be done |

**Response (201):**
```json
{
  "id": 1,
  "occurrence": 1,
  "user": 5,
  "user_name": "Suresh Reddy",
  "before_photo": "/media/work_logs/before/photo1.jpg",
  "before_photo_taken_at": "2026-03-11T09:00:00Z",
  "after_photo": null,
  "after_photo_taken_at": null,
  "status": "in_progress",
  "description": "Starting cleaning work",
  "approval_status": "pending",
  "created_at": "2026-03-11T09:00:00Z"
}
```

> **Note:** The `user` is auto-set to the logged-in user. The occurrence status is auto-updated to `in_progress` if it was `pending`.

---

### 8.3 Complete Work Log
```
PATCH /api/work-logs/{id}/complete/
```
**When to use:** Employee finishes work — uploads the "after" photo to mark completion.

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `after_photo` | file | **Yes** | Photo after completing work |

**Response (200):**
```json
{
  "id": 1,
  "occurrence": 1,
  "user": 5,
  "user_name": "Suresh Reddy",
  "before_photo": "/media/work_logs/before/photo1.jpg",
  "before_photo_taken_at": "2026-03-11T09:00:00Z",
  "after_photo": "/media/work_logs/after/photo2.jpg",
  "after_photo_taken_at": "2026-03-11T14:30:00Z",
  "status": "completed",
  "description": "Cleaned all floors",
  "approval_status": "pending",
  "created_at": "2026-03-11T09:00:00Z"
}
```

> **Note:** The occurrence is also auto-marked as `completed` with `completed_by` and `completed_at` set.

**Error (400):**
```json
{
  "error": "after_photo is required"
}
```

---

### 8.4 Review Work Log (Admin Approval)
```
PATCH /api/work-logs/{id}/review/
```
**Permission:** Admin only
**When to use:** Admin approves or rejects a completed work log.

**Request Body:**
```json
{
  "approval_status": "approved"
}
```

Or for rejection:
```json
{
  "approval_status": "rejected",
  "rejection_reason": "After photo is unclear, please retake"
}
```

**Approval Status Values:** `pending`, `approved`, `rejected`

**Response (200):**
```json
{
  "id": 1,
  "occurrence": 1,
  "user": 5,
  "user_name": "Suresh Reddy",
  "status": "completed",
  "approval_status": "approved",
  "rejection_reason": null,
  "reviewed_by": 1,
  "reviewed_by_name": "Admin User",
  "reviewed_at": "2026-03-11T15:00:00Z"
}
```

**Error (403):**
```json
{
  "error": "Only admins can review work logs"
}
```

---

## 9. Payments

### 9.1 List Payments
```
GET /api/payments/
```
**When to use:** View all payments. Auto-filtered by role:
- **Admin:** sees payments for activities in their branch
- **Vendor Owner:** sees payments for their activities
- **Vendor Employee:** sees payments for their vendor's activities

**Query Params:**
| Param | Description | Example |
|-------|-------------|---------|
| `payment_status` | Filter by status | `?payment_status=pending` |

**Response (200):**
```json
[
  {
    "id": 1,
    "activity": 1,
    "activity_title": "Daily Office Cleaning",
    "vendor_name": "Ram Cleaning Services",
    "expected_amount": "15000.00",
    "actual_amount_paid": "15000.00",
    "payment_status": "completed",
    "payment_date": "2026-03-10",
    "notes": "March payment completed",
    "receipt": "/media/payment_receipts/receipt_march.pdf",
    "created_at": "2026-03-01T10:00:00Z"
  }
]
```

---

### 9.2 Create Payment
```
POST /api/payments/
```
**Permission:** Admin only
**When to use:** Record a payment for an activity.

**Request Body:**
```json
{
  "activity": 1,
  "expected_amount": "15000.00",
  "actual_amount_paid": "15000.00",
  "payment_status": "completed",
  "payment_date": "2026-03-10",
  "notes": "March payment"
}
```

**Payment Status Values:** `pending`, `partial`, `completed`

> **Note:** If `expected_amount` is 0 or not provided, it is auto-set from the activity's `expected_cost`.

**Response (201):**
```json
{
  "id": 1,
  "activity": 1,
  "activity_title": "Daily Office Cleaning",
  "vendor_name": "Ram Cleaning Services",
  "expected_amount": "15000.00",
  "actual_amount_paid": "15000.00",
  "payment_status": "completed",
  "payment_date": "2026-03-10",
  "notes": "March payment",
  "receipt": null,
  "created_at": "2026-03-10T10:00:00Z"
}
```

---

### 9.3 Upload Payment Receipt
```
POST /api/payments/{id}/upload-receipt/
```
**When to use:** Upload a receipt file (PDF/image) for an existing payment.

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receipt` | file | **Yes** | Receipt file (PDF, image, etc.) |

**Response (200):**
```json
{
  "message": "Receipt uploaded successfully",
  "receipt": "/media/payment_receipts/receipt_march.pdf"
}
```

**Error (400):**
```json
{
  "error": "No receipt file provided"
}
```

---

### 9.4 Get / Update / Delete Payment
```
GET    /api/payments/{id}/
PUT    /api/payments/{id}/
PATCH  /api/payments/{id}/
DELETE /api/payments/{id}/
```
**Permission:** Admin only (for write operations)

---

## 10. Dashboard

> **Permission:** Admin only for all dashboard endpoints.

### 10.1 Dashboard Stats
```
GET /api/dashboard/stats/
```
**When to use:** Show summary cards on the admin dashboard.

**Response (200):**
```json
{
  "total_vendors": 12,
  "total_activities": 45,
  "total_employees": 38,
  "pending_payments_amount": 125000.00,
  "completed_payments_amount": 350000.00,
  "overdue_activities_count": 3,
  "activities_by_status": {
    "pending": 10,
    "in_progress": 20,
    "completed": 12,
    "cancelled": 3
  }
}
```

---

### 10.2 Spending Trends
```
GET /api/dashboard/spending-trends/
```
**When to use:** Show spending chart on admin dashboard (last 6 months).

**Response (200):**
```json
[
  { "month": "Oct 2025", "amount": 45000.00 },
  { "month": "Nov 2025", "amount": 52000.00 },
  { "month": "Dec 2025", "amount": 48000.00 },
  { "month": "Jan 2026", "amount": 55000.00 },
  { "month": "Feb 2026", "amount": 60000.00 },
  { "month": "Mar 2026", "amount": 35000.00 }
]
```

---

### 10.3 Completion Rates
```
GET /api/dashboard/completion-rates/
```
**When to use:** Show completion rate chart on admin dashboard (last 6 months).

**Response (200):**
```json
[
  { "month": "Oct 2025", "rate": 78.5 },
  { "month": "Nov 2025", "rate": 82.3 },
  { "month": "Dec 2025", "rate": 75.0 },
  { "month": "Jan 2026", "rate": 88.9 },
  { "month": "Feb 2026", "rate": 91.2 },
  { "month": "Mar 2026", "rate": 85.0 }
]
```

---

## Quick Reference — Role-Based Access

| Endpoint | Admin | Vendor Owner | Vendor Employee |
|----------|-------|-------------|-----------------|
| Login | Yes | Yes | Yes |
| Profile | Yes | Yes | Yes |
| Branches (CRUD) | Full | Read | Read |
| Categories (CRUD) | Full | Read | Read |
| Vendors (List) | Branch-filtered | Own only | — |
| Vendors (Create/Edit/Delete) | Yes | No | No |
| Vendors (Toggle Active) | Yes | No | No |
| Employees (List) | Branch-filtered | Own employees | Self only |
| Employees (Create) | Yes | Yes | No |
| Employees (Edit) | Yes | Yes | No |
| Employees (Toggle Active) | Yes | Own employees | No |
| Activities (List) | Branch-filtered | Own activities | Vendor's activities |
| Activities (Create/Edit/Delete) | Yes | No | No |
| Occurrences (List/Today) | Branch-filtered | Own activities | Vendor's activities |
| Work Logs (Create) | Yes | Yes | Yes |
| Work Logs (Complete) | Yes | Yes | Yes |
| Work Logs (Review) | Yes | No | No |
| Payments (List) | Branch-filtered | Own activities | Vendor's activities |
| Payments (Create/Edit/Delete) | Yes | No | No |
| Dashboard Stats/Trends | Yes | No | No |

---

## Common Workflows

### Workflow 1: Employee Daily Task Flow
```
1. GET  /api/occurrences/today/          → See today's tasks
2. POST /api/work-logs/                  → Start work (upload before_photo)
3. PATCH /api/work-logs/{id}/complete/   → Complete work (upload after_photo)
```

### Workflow 2: Admin Reviews Work
```
1. GET  /api/activities/{id}/occurrences/    → View activity occurrences + work logs
2. PATCH /api/work-logs/{id}/review/         → Approve or reject work log
```

### Workflow 3: Admin Creates Activity
```
1. GET  /api/categories/                → Get categories for dropdown
2. GET  /api/vendors/                   → Get vendors for dropdown
3. POST /api/activities/                → Create activity (occurrences auto-generated)
```

### Workflow 4: Admin Onboards Vendor + Employee
```
1. POST /api/vendors/                   → Create vendor (save credentials!)
2. POST /api/employees/                 → Add employee under vendor (save credentials!)
```

### Workflow 5: Vendor Owner Manages Employees
```
1. GET   /api/employees/?vendor_owner={id}           → List own employees
2. PATCH /api/employees/{id}/                        → Edit employee details
3. PATCH /api/employees/{id}/toggle-active/          → Deactivate/activate employee
```

### Workflow 6: Admin Deactivates Vendor
```
1. PATCH /api/vendors/{id}/toggle-active/            → Deactivate vendor + all employees
```

### Workflow 7: Admin Records Payment
```
1. GET  /api/activities/                → Get activity list
2. POST /api/payments/                  → Create payment record
3. POST /api/payments/{id}/upload-receipt/ → Upload receipt
```
