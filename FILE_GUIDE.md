# Vendor Portal — File Guide

> This document explains every file in the project, what it contains, and what it does.
> Updated as code is being written.

---

## Root Files

| File | Purpose |
|------|---------|
| `architecture.md` | Full system architecture documentation — DB schema, API endpoints, auth flow, data flows |
| `FILE_GUIDE.md` | This file — explains every file in the project |
| `conversation_log.md` | Planning conversation log |
| `prompts.md` | Prompt templates used during planning |

---

## Backend (`backend/`) — Django REST API

### Core Configuration

| File | What it does |
|------|-------------|
| `manage.py` | Django CLI entry point — run server, migrations, seed data |
| `vendor_portal/settings.py` | Django settings — installed apps, JWT config, CORS, media paths, DB config (SQLite) |
| `vendor_portal/urls.py` | Root URL router — mounts all API routes under `/api/` and serves media files |
| `vendor_portal/wsgi.py` | WSGI entry point for production deployment |

### `accounts/` — Authentication & Users

| File | What it does |
|------|-------------|
| `accounts/models.py` | **Custom User model** extending AbstractUser — adds `role` (admin/vendor_owner/vendor_employee), `branch` (FK), `phone`, `aadhar_number`, `photo` (ImageField) |
| `accounts/serializers.py` | Serializers for User model, Login (validates credentials, returns JWT + user info), Profile |
| `accounts/views.py` | **LoginView** (POST `/api/auth/login/` → JWT tokens + user data), **ProfileView** (GET current user) |
| `accounts/permissions.py` | Permission classes: `IsAdmin`, `IsVendorOwner`, `IsVendorEmployee` — check `request.user.role` |
| `accounts/urls.py` | Auth URL routes: `/api/auth/login/`, `/api/auth/token/refresh/`, `/api/auth/profile/` |

### `vendors/` — Branches, Vendors, Employees

| File | What it does |
|------|-------------|
| `vendors/models.py` | **Branch** (name, address, city), **Vendor** (OneToOne→User, FK→Branch, company_name, M2M→WorkCategory), **Employee** (OneToOne→User, FK→Vendor) |
| `vendors/serializers.py` | Serializers that handle **auto-credential generation** — when creating a vendor/employee, auto-creates a User with generated username (from phone) and random 8-char password, returns credentials once |
| `vendors/views.py` | **BranchViewSet** (CRUD, admin only), **VendorViewSet** (CRUD + filter by category via `/by-category/?cat=ID`), **EmployeeViewSet** (CRUD, vendor owners create their own employees). All admin queries are **branch-scoped** (auto-filter by admin's branch) |
| `vendors/urls.py` | Routes: `/api/branches/`, `/api/vendors/`, `/api/vendors/by-category/`, `/api/employees/` |
| `vendors/management/commands/seed_data.py` | **Seed data command** — creates 3 branches, 6 categories, 3 admins, 6 vendors, 12 employees, 15 activities with occurrences, 30 work logs, 15 payments. Prints all credentials at the end. Run with `python manage.py seed_data` |

### `categories/` — Work Categories

| File | What it does |
|------|-------------|
| `categories/models.py` | **WorkCategory** model — name (unique), description |
| `categories/serializers.py` | Simple ModelSerializer for WorkCategory |
| `categories/views.py` | **WorkCategoryViewSet** — admin can CRUD, all authenticated users can read |
| `categories/urls.py` | Routes: `/api/categories/` |

### `activities/` — Activities, Occurrences, Work Logs

| File | What it does |
|------|-------------|
| `activities/models.py` | **Activity** (branch, vendor, category FKs; title; type: one_time/long_term/recurring; dates; cost; status; `is_overdue` computed property), **ActivityOccurrence** (FK→Activity, scheduled_date, status: pending/completed/missed, completed_by), **WorkLog** (FK→Occurrence, user, before_photo, after_photo, description) |
| `activities/serializers.py` | Activity serializer includes `is_overdue` and occurrence count. WorkLog serializer handles **multipart photo uploads** |
| `activities/views.py` | **ActivityViewSet** — on create, **auto-generates occurrences** based on type (one_time→1, long_term→daily, recurring→every N days). Nested route for occurrences. **OccurrenceViewSet** — `/api/occurrences/today/` returns today's tasks filtered by vendor. **WorkLogViewSet** — handles photo upload via multipart form data |
| `activities/urls.py` | Routes: `/api/activities/`, `/api/activities/{id}/occurrences/`, `/api/occurrences/`, `/api/occurrences/today/`, `/api/work-logs/` |

### `payments/` — Payment Tracking

| File | What it does |
|------|-------------|
| `payments/models.py` | **Payment** model — FK→Activity, expected_amount, actual_amount_paid, payment_status (pending/partial/completed), payment_date, notes |
| `payments/serializers.py` | Payment serializer with nested activity/vendor info for display |
| `payments/views.py` | **PaymentViewSet** — CRUD, admin-only for create/update, vendors can view their own. Branch-scoped for admins |
| `payments/urls.py` | Routes: `/api/payments/` |

### Dashboard (in accounts or separate)

| Endpoint | What it returns |
|----------|----------------|
| `GET /api/dashboard/stats/` | Total vendors, activities, employees, pending/completed payment amounts, overdue count, activities by status |
| `GET /api/dashboard/spending-trends/` | Monthly spending totals for last 6 months (for bar chart) |
| `GET /api/dashboard/completion-rates/` | Monthly task completion percentages for last 6 months (for line chart) |

---

## Admin Portal (`admin-portal/`) — React Dashboard

### Configuration

| File | What it does |
|------|-------------|
| `package.json` | Dependencies: react, react-router-dom, axios, recharts, tailwindcss |
| `vite.config.js` | Vite config with Tailwind CSS v4 plugin (`@tailwindcss/vite`) |
| `src/index.css` | Tailwind import (`@import "tailwindcss"`) — entry point for all styles |
| `src/main.jsx` | React app entry point — renders `<App />` |

### Core Infrastructure

| File | What it does |
|------|-------------|
| `src/App.jsx` | **Root router** — sets up all routes inside `<AuthProvider>`. Public: `/login`. Protected (inside `<Layout>`): `/dashboard`, `/vendors`, `/vendors/:id`, `/activities`, `/activities/:id`, `/payments`, `/categories` |
| `src/context/AuthContext.jsx` | **Auth state management** — stores user info + JWT tokens in state & localStorage. Provides `login()`, `logout()`, `user`, `isAuthenticated` to all components |
| `src/services/api.js` | **Axios instance** with base URL `http://localhost:8000/api`. Request interceptor attaches JWT token. Response interceptor catches 401 → tries token refresh → redirects to login if refresh fails |

### Components

| File | What it does |
|------|-------------|
| `src/components/Layout.jsx` | **Page layout** — sidebar on left (w-64, dark slate), top bar with user info + logout, main content area with `<Outlet />` for nested routes |
| `src/components/Sidebar.jsx` | **Navigation** — links to Dashboard, Vendors, Activities, Payments, Categories with icons. Uses `NavLink` for active state highlighting |
| `src/components/ProtectedRoute.jsx` | **Auth guard** — if not authenticated, redirects to `/login`. Otherwise renders children |

### Pages

| File | What it does |
|------|-------------|
| `src/pages/Login.jsx` | **Login form** — centered card with username/password fields, "Vendor Portal Admin" branding, error display, redirects to dashboard on success |
| `src/pages/Dashboard.jsx` | **Main dashboard** — fetches stats from 3 API endpoints. Shows: (1) Stat cards row (total vendors, activities, pending payments, overdue count), (2) Spending Trends bar chart (Recharts), (3) Completion Rates line chart, (4) Activities by Status pie chart |
| `src/pages/Vendors.jsx` | **Vendor list + registration** — table of all vendors (company, owner, branch, categories, phone). "Add Vendor" button opens modal form. On create, **displays generated credentials** (username + password) — shown only once |
| `src/pages/VendorDetail.jsx` | **Single vendor view** (`/vendors/:id`) — vendor info, employee list with "Add Employee" button (shows credentials), activities list, payment summary |
| `src/pages/Activities.jsx` | **Activity list + creation** — table with title, vendor, category, type, status, dates, cost, overdue indicator (red). "Create Activity" form with conditional fields (recurring shows interval). Filter by status/type |
| `src/pages/ActivityDetail.jsx` | **Single activity view** (`/activities/:id`) — activity info, occurrences table (date, status, completed by), work logs with before/after photos |
| `src/pages/Payments.jsx` | **Payment tracking** — summary cards (total expected, paid, pending), table of payments, "Record Payment" form with activity dropdown (auto-fills expected amount), filter by status |
| `src/pages/Categories.jsx` | **Category management** — simple CRUD list with add/edit modal (name + description), delete with confirmation |

---

## Vendor App (`vendor-app/`) — Flutter Mobile App

### Configuration

| File | What it does |
|------|-------------|
| `pubspec.yaml` | Dependencies: provider, http, image_picker, shared_preferences, intl |
| `android/app/src/main/AndroidManifest.xml` | Permissions: internet, camera, storage |

### Models (`lib/models/`)

| File | What it does |
|------|-------------|
| `user.dart` | User model with `fromJson()` — id, username, name, role, phone, branch. Helper getters: `isOwner`, `isEmployee`, `fullName` |
| `activity.dart` | Activity model — title, type, category, dates, status, cost, isOverdue |
| `occurrence.dart` | ActivityOccurrence model — activity ref, scheduled_date, status, completed_by |
| `work_log.dart` | WorkLog model — occurrence ref, photos (URLs), description, created_at |
| `employee.dart` | Employee model — user info, vendor_owner ref |

### Services (`lib/services/`)

| File | What it does |
|------|-------------|
| `api_service.dart` | **HTTP client** — base URL `http://10.0.2.2:8000/api` (Android emulator). Methods for all API calls: login, refresh token, get today's tasks, submit work log (multipart with photos), manage employees. Auto-attaches JWT from SharedPreferences. Handles 401 → refresh → retry |
| `auth_service.dart` | **Token storage** — save/load/clear JWT tokens and user data from SharedPreferences |

### Providers (`lib/providers/`)

| File | What it does |
|------|-------------|
| `auth_provider.dart` | **Auth state** (ChangeNotifier) — user, isAuthenticated, isLoading, error. `login()`, `logout()`, `loadUser()` (check stored token on app start) |
| `activity_provider.dart` | **Task state** (ChangeNotifier) — today's tasks list, loading state. `loadTodayTasks()`, `updateOccurrenceStatus()` |

### Screens (`lib/screens/`)

| File | What it does |
|------|-------------|
| `login_screen.dart` | **Login form** — Material Design, username + password with icons, loading spinner, error messages, blue theme |
| `owner_dashboard.dart` | **Vendor owner home** — app bar, drawer with nav (Tasks, Employees, Logout), today's tasks as cards, pull-to-refresh. Tap task → occurrence detail |
| `employee_dashboard.dart` | **Employee home** — simplified version of owner dashboard, only shows assigned tasks, no employee management |
| `employee_list_screen.dart` | **Employee management** (owner only) — list of employees with name, phone, aadhar. FAB to add new employee |
| `add_employee_screen.dart` | **Add employee form** — first name, last name, phone, aadhar. On success: **shows credentials dialog** (username + password, displayed once only) |
| `occurrence_detail_screen.dart` | **Task detail** — occurrence info, activity details, status update buttons (Complete/Missed), work logs list with photos, "Add Work Log" button |
| `work_log_screen.dart` | **Submit work log** — before photo picker (camera/gallery via image_picker), after photo picker, description field, submit button with progress indicator. Uploads as multipart form |

### Widgets (`lib/widgets/`)

| File | What it does |
|------|-------------|
| `task_card.dart` | **Reusable task card** — shows activity title, category tag, date, color-coded status badge (green=completed, orange=pending, red=missed). onTap callback |
| `photo_picker.dart` | **Reusable photo picker** — shows placeholder or selected image. Tap → bottom sheet with Camera/Gallery options. Returns selected File |

---

## Key Flows

### 1. Vendor Registration (Admin Portal)
Admin fills form → API auto-creates User (generated username from phone, random password) → Response includes credentials → Admin shares credentials with vendor

### 2. Activity + Occurrence Generation
Admin creates activity → Backend auto-generates occurrences:
- **one_time**: 1 occurrence on start_date
- **long_term**: 1 per day, start → end
- **recurring**: every N days, start → end

### 3. Work Log Submission (Flutter App)
Vendor opens today's tasks → taps task → takes before photo → does work → takes after photo → writes description → submits → occurrence marked complete

### 4. Payment Tracking
Admin records payment against activity → tracks expected vs actual amount → status: pending/partial/completed

---

## Running the Project

```bash
# 1. Backend
cd backend
python manage.py migrate
python manage.py seed_data    # Creates dummy data, prints credentials
python manage.py runserver    # Runs on http://localhost:8000

# 2. Admin Portal
cd admin-portal
npm install
npm run dev                   # Runs on http://localhost:5173

# 3. Flutter App
cd vendor-app
flutter pub get
flutter run                   # Run on Android emulator
```

## Default Credentials (from seed data)
| Role | Username | Password |
|------|----------|----------|
| Admin (HSR) | admin_hsr | admin123 |
| Admin (Whitefield) | admin_whitefield | admin123 |
| Admin (Sarjapur) | admin_sarjapur | admin123 |
| Vendors & Employees | (printed by seed_data command) | (printed by seed_data command) |
