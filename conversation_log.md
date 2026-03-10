# Test Assignment - Conversation Log

**Date:** 2026-03-10
**Participant:** Nagarjun
**Tool:** Claude Code (Claude Opus 4.6)

---

## Conversation

### Entry 1 — Setup
**User:** Explained they have a test assignment with a problem statement. They are allowed to use Claude, and the conversation history will be reviewed. Requested that the full conversation be saved to an MD file going forward.

**Claude:** Created this `conversation_log.md` file to track the entire conversation, decisions, and actions taken.

---

### Entry 2 — Problem Statement Received

**Problem Statement Summary:**
- **Company:** K12 Techno Services (140+ Orchids International Schools)
- **Project:** Vendor Portal — tracks vendors, their work, and payments for school activities
- **Activities examples:** cleaning swimming pool, building a block, event prep, etc.

**Tech Stack:**
- Admin Portal: React
- Vendor App: Flutter
- Backend: Django (serves both admin & vendor app)
- DB: SQLite
- Auth: JWT + Role-based access

**Key Features:**

**Admin Portal (React):**
- School admin only (no vendor access)
- Register vendors (name, phone, Aadhar, photo, etc.)
- Auto-generate vendor credentials (for vendor app login only)
- Branch-based: each school branch has its own admin, vendors mapped to that branch
- Create activities/jobs and assign vendors
- Job categories/types — vendors are assigned to specific types at registration
- When assigning, show only vendors matching that job category
- Admin can add new work types
- Track job progress
- Job scheduling: one-time, multi-day, or recurring (e.g., every 3 days for 100 days)
- Show overdue jobs (took longer than expected)
- Show expected cost per activity
- View vendor daily work logs (before/after photos, descriptions)

**Vendor App (Flutter):**
- Vendor owner logs in with admin-provided credentials
- Owner can register employees (photo, name, phone, Aadhar) — employees get their own credentials
- Employees mapped under the owner
- Dashboard shows today's scheduled activities
- Both owner & employees must: take before/after photos, log work done, describe what was done

**Claude:** Entering plan mode to ask clarifying questions before building.

---

### Entry 3 — Clarifications Resolved

**Payment Tracking:**
- 3 payment types: Hourly, Daily, Contract
- Track expected cost + actual payment amount (admin enters after payment)
- Dummy data needed for testing the whole system

**Other Decisions:**
- Admin levels: Branch admin only (no super admin)
- Platform: Android only for Flutter app
- Photo storage: Django media files (built-in FileField)
- Dashboard: Charts & analytics (spending trends, job completion rates, vendor performance)

---

### Entry 4 — Plan Designed

**Claude:** Created full implementation plan covering:
- DB models (User, Branch, Vendor, Employee, WorkCategory, Activity, ActivityOccurrence, WorkLog, Payment)
- 20+ API endpoints with JWT auth and role-based access
- Recurring activity auto-generation logic (one-time, long-term, recurring)
- 3 payment types (hourly, daily, contract) with expected vs actual tracking
- Auto-credential generation for vendors and employees
- React admin portal with dashboard charts (Recharts), vendor/activity/payment management
- Flutter vendor app with login, today's tasks, work log submission with camera
- Dummy seed data (3 branches, 6 categories, 3 admins, 6 vendors, 12 employees, 15 activities, 30 work logs, 15 payments)
- `architecture.md` documentation file
- Parallel agent strategy: backend, admin portal, Flutter app, and docs built simultaneously

**User:** Also requested an `architecture.md` file explaining the whole system architecture.

---

### Entry 5 — Implementation (All Components)

**User:** Requested implementation of the full plan.

**Claude:** Attempted to use 4 parallel agents (backend, admin portal, Flutter app, docs) but all agents hit permission blocks for Bash/Write tools.

**User:** "ok do one thing do all of them by yourself and they are hitting permission blocks"

**Claude:** Built everything directly in the main conversation:

1. **Backend (Django):**
   - Scaffolded `vendor_portal` project + `accounts`, `vendors`, `categories`, `activities`, `payments` apps
   - Custom User model (AbstractUser) with role, branch FK, phone, aadhar_number, photo
   - Branch, Vendor, Employee, WorkCategory, Activity, ActivityOccurrence, WorkLog, Payment models
   - JWT auth (simplejwt) with login/profile endpoints
   - Role-based permissions (IsAdmin, IsVendorOwner, IsVendorEmployee)
   - Auto-credential generation for vendors and employees
   - Recurring occurrence auto-generation (one_time, long_term, recurring)
   - Branch-scoped queries for all admin endpoints
   - Dashboard stats, spending trends, completion rates endpoints
   - Seed data command with dummy data

2. **Admin Portal (React + Vite + Tailwind):**
   - Had to downgrade from Tailwind v4 + Vite 7 to Tailwind v3 + Vite 5 (Node 18 compatibility)
   - Auth context with JWT token management + Axios interceptors
   - Dashboard with stat cards + Recharts (Bar, Line, Pie charts)
   - Vendor management (list, register with auto-credentials, detail page)
   - Activity management (list with filters, create with conditional fields, detail with work logs)
   - Payment tracking (summary cards, table, record payment modal)
   - Category CRUD management

3. **Flutter Vendor App:**
   - Provider pattern for state management
   - Login screen + auth service with SharedPreferences
   - Owner dashboard with drawer nav + today's tasks
   - Employee dashboard (simplified view)
   - Employee list + add employee with credentials display
   - Occurrence detail with status actions
   - Work log submission with camera (before/after photos)
   - Task card widget with status colors

4. **Documentation:**
   - `architecture.md` — Full system architecture (627 lines)

**Bug Fix:** Activity creation returned 400 error because `branch` was required in serializer but set in `perform_create`. Fixed by adding `extra_kwargs = {'branch': {'required': False}}` to ActivitySerializer.

---

### Entry 6 — FILE_GUIDE.md

**User:** "can you also give me an md file which explain what file you created has what and what it does"

**Claude:** Created `FILE_GUIDE.md` with file-by-file explanations of the entire project — backend, admin portal, Flutter app, and documentation files.

---

### Entry 7 — API Endpoint Testing

**User:** "test all the api endpoints"

**Claude:** Tested all endpoints using curl/httpie. Verified auth, CRUD operations, dashboard stats, occurrence generation, and work log creation all working correctly.

---

### Entry 8 — Category Update

**User:** Provided a table of 14 school-specific categories (replacing the original 6 generic ones):
1. Housekeeping & Cleaning
2. Security & Surveillance
3. Civil & Structural Maintenance
4. Plumbing & Water Management
5. Electrical & Power Systems
6. HVAC & Ventilation
7. Pest Control & Fumigation
8. Landscaping & Gardening
9. Waste Management & Disposal
10. Cafeteria & Kitchen Services
11. Transport & Fleet Maintenance
12. IT & Network Infrastructure
13. Fire Safety & Compliance
14. Event Setup & Logistics

**User:** Asked if the categories looked fine, then accepted Claude's minor naming suggestions.

**Claude:** Updated the seed data command with all 14 categories, expanded to 9 vendors (mapped to relevant categories), 18 employees, and 21 activities covering the new categories. Re-ran migrations and seed data.

---

### Entry 9 — Photo Upload Timestamps

**User:** "the before and after photos should have time stamp of when they are uploaded"

**Claude:** Added photo upload timestamps across the full stack:

1. **Backend model** (`activities/models.py`): Added `before_photo_taken_at` and `after_photo_taken_at` DateTimeFields to WorkLog
2. **Backend serializer** (`activities/serializers.py`): Auto-sets timestamps in `create()` and `update()` when photos are provided; fields are read-only
3. **Migration**: Created and applied `0002_worklog_after_photo_taken_at_and_more.py`
4. **Admin portal** (`ActivityDetail.jsx`): Shows `toLocaleString()` formatted timestamp under each before/after photo
5. **Flutter model** (`work_log.dart`): Added `beforePhotoTakenAt`, `afterPhotoTakenAt` fields with `formattedBeforeTime`/`formattedAfterTime` helper getters
6. **Flutter screen** (`occurrence_detail_screen.dart`): Displays formatted timestamps as small grey text below each photo in work log history

---

### Entry 10 — Test Credentials File

**User:** "can you write all the test credentials in a .md file"

**Claude:** Reset vendor/employee passwords to predictable values and created `TEST_CREDENTIALS.md` with all admin, vendor owner, and employee credentials organized by branch, plus quick test flow instructions and cURL examples.

---

### Entry 11 — Optional Company Name

**User:** "not every vendor has a company name"

**Claude:** Made `company_name` optional across the full stack:

1. **Backend model** (`vendors/models.py`): Changed `company_name` to `blank=True, default=''`, added `display_name` property that falls back to user's full name
2. **Migration**: Created `0002_alter_vendor_company_name.py`
3. **Backend serializers**: Updated `VendorSerializer` to include `display_name` field and made `company_name` not required; updated `ActivitySerializer` and `PaymentSerializer` to use `vendor.display_name` instead of `vendor.company_name`
4. **Admin portal**: Updated `Vendors.jsx` (table shows display name, form marks company name as optional), `VendorDetail.jsx` (heading falls back to owner name), `Activities.jsx` (vendor dropdown shows display name)
5. **Seed data**: Changed 3 of 9 vendors to have no company name (Suresh Gowda, Venkat Reddy, Rohit Gupta) — they display as their personal names instead

---

### Entry 12 — Admin Portal UI Overhaul

**User:** Provided an HTML/CSS design mockup for the admin portal with an Orchids Schools theme — green sidebar, DM Sans + Fraunces fonts, stat cards with colored top borders, donut charts, styled data tables with badge dots, card-based categories, payment summary cards with tabs, and clean modals with backdrop blur.

**Claude:** Complete UI overhaul of the admin portal to match the design:

1. **Fonts & Theme**: Added Google Fonts (DM Sans + Fraunces), Orchids green (#1a6b4a) as primary color with amber/red/blue accents
2. **Tailwind Config**: Extended with `orchid` colors and `font-serif`/`font-sans` families
3. **CSS**: Added CSS variables, badge dot pseudo-element, progress bars, fade-up animations, custom scrollbar, modal backdrop blur
4. **Sidebar** (`Sidebar.jsx`): Green background, school brand with emoji icon, branch indicator with green dot, nav items with emoji icons, admin chip at bottom with initials avatar and logout button
5. **Layout** (`Layout.jsx`): Top bar with Fraunces serif title + subtitle per page, search bar placeholder
6. **Login** (`Login.jsx`): Green gradient background, school emoji icon, Orchids branding
7. **Dashboard** (`Dashboard.jsx`): 4 stat cards with colored top borders + icons, bar chart with monthly spending summary, donut chart for activity status, active vendors table, and alerts section with colored dots
8. **Vendors** (`Vendors.jsx`): Clean table with company/owner column, emoji phone icons, badge categories, icon buttons for view/delete, styled modal with chip-style category selection, credential auto-generation notice
9. **Activities** (`Activities.jsx`): Filter dropdowns, type and status badges with dots, budget in tabular nums, overdue warning badges
10. **Payments** (`Payments.jsx`): 3-column summary cards (budget/paid/pending), tab-based filtering (All/Pending/Completed/Partial), colored amount values, Pay Now buttons
11. **Categories** (`Categories.jsx`): Card grid layout with emoji icons per category, edit/delete icon buttons
12. **VendorDetail** (`VendorDetail.jsx`): Updated with new theme styling
13. **ActivityDetail** (`ActivityDetail.jsx`): Progress bar for occurrences, styled work log cards

Build verified successfully.

---

### Entry 13 — Photo Registration for Vendors & Employees

**User:** "the vendor owner and the employees also need photo to get registered, can you add this and also use some dummy photos in the seed data for the existing ones"

**Claude:** Added photo upload requirement for vendor and employee registration across the full stack, plus generated dummy avatar photos for all existing seed data users:

1. **Backend serializers** (`accounts/serializers.py`): Added `photo` field to `UserSerializer` and `ProfileSerializer` so photo URLs appear in API responses
2. **Backend serializers** (`vendors/serializers.py`): Added write-only `photo` ImageField to both `VendorSerializer` and `EmployeeSerializer`; `create()` methods pop the photo, create the user, then save the photo to the user's `photo` field
3. **Seed data** (`seed_data.py`): Added `generate_avatar()` function using Pillow — creates 200x200 colored circle avatars with white initials. 12 distinct colors defined. All 30 users (3 admins + 9 vendors + 18 employees) now get generated avatar photos saved to `media/user_photos/`
4. **Admin portal — Vendors.jsx**: Add vendor modal now includes photo upload field with preview; form submission uses `FormData` (multipart) instead of JSON; vendor table shows user photos with initials fallback
5. **Admin portal — VendorDetail.jsx**: Vendor header displays photo; employee table shows photos with initials fallback; add employee modal includes photo upload with preview; employee submission uses `FormData` (multipart)
6. **Flutter — api_service.dart**: `addEmployee()` method rewritten to use `http.MultipartRequest` with optional photo file attachment
7. **Flutter — add_employee_screen.dart**: Added camera/gallery photo picker using `image_picker`, CircleAvatar preview, photo required validation before submission

Build verified successfully.

---

### Entry 14 — Flutter App UI Overhaul

**User:** Provided an HTML/CSS mockup for the Flutter vendor app with Orchids green theme — green hero headers with curved bottoms, Nunito + Fraunces fonts, task cards with left accent bars and category emoji icons, today summary stat cards, bottom navigation with emoji icons and active pip indicators, detail screens with green gradient heroes, progress rings, photo upload boxes with dashed borders, success overlay, employee management cards, and styled login screen.

**Claude:** Complete UI overhaul of the Flutter vendor app to match the design:

1. **Dependencies**: Added `google_fonts: ^6.1.0` to pubspec.yaml for Nunito and Fraunces fonts
2. **Theme** (`lib/theme/app_theme.dart`): New file with `AppColors` (green, amber, red, blue with light variants, bg, border, text, muted), `AppTheme` class with styled inputs, green/outline button styles, card decoration, and heading/label text styles using Google Fonts
3. **Main** (`main.dart`): Updated to use `AppTheme.theme`, green splash screen during auto-login with school emoji
4. **New Widgets**:
   - `hero_header.dart`: `HeroHeader` with curved green gradient, greeting text in Fraunces, initials avatar with notification badge; `TodaySummary` with 3-column stat cards (Fraunces numbers, overlapping card effect)
   - `bottom_nav.dart`: `AppBottomNav` with emoji icons, uppercase labels, green active pip, scale animation
   - `detail_hero.dart`: `DetailHero` with green gradient, back button, title/subtitle, optional trailing widget
5. **Login** (`login_screen.dart`): Green gradient background, school emoji, Orchids branding, white card with labeled inputs, arrow sign-in button, credential hint
6. **Owner Dashboard** (`owner_dashboard.dart`): Full rewrite with bottom navigation (Home/Tasks/Team/Profile tabs), hero header with greeting + date + branch, today summary cards, task list with "See All" link, team section with employee cards (initials avatar), profile tab with info block and logout
7. **Employee Dashboard** (`employee_dashboard.dart`): Similar with 3 tabs (Home/Tasks/Profile), hero header with tool emoji, simplified summary
8. **Task Card** (`task_card.dart`): Left accent bar colored by status, category emoji icon in rounded box, status badge pill, chevron arrow, Nunito typography
9. **Occurrence Detail** (`occurrence_detail_screen.dart`): Detail hero with progress ring (custom `CustomPainter`), status/category chips, info block rows, description section, work log cards with photo thumbnails, styled action buttons
10. **Work Log** (`work_log_screen.dart`): Detail hero, photo upload boxes (filled state with checkmark, label overlay), description textarea in card, success overlay (green fullscreen with emoji + message + back button), loading overlay
11. **Employee List** (`employee_list_screen.dart`): Supports `embedded` mode (for bottom nav tab) and standalone; green header, add button, employee list in card with initials avatars
12. **Add Employee** (`add_employee_screen.dart`): Detail hero, photo picker card, form fields card with section labels, credential auto-generation notice (amber box), styled credentials dialog with Fraunces title

Flutter analyze passed with 0 errors (only info-level warnings about `withOpacity` deprecation).

---

### Entry 15 — Automated Test Suite

**User:** "and also run automated tests to check the features"

**Claude:** Created comprehensive automated tests across all 5 Django apps (48 test cases total). All existing test files were empty stubs — replaced with full test suites.

**Test files written:**

1. **`accounts/tests.py`** (11 tests):
   - `UserModelTest`: user creation, role choices, optional photo field
   - `LoginAPITest`: successful login (returns JWT tokens + user), wrong password, nonexistent user, missing fields
   - `ProfileAPITest`: authenticated profile fetch (returns username/role/branch), unauthenticated returns 401
   - `DashboardAPITest`: admin can access stats/spending-trends/completion-rates, non-admin gets 403

2. **`categories/tests.py`** (9 tests):
   - `WorkCategoryModelTest`: creation, unique name constraint
   - `WorkCategoryAPITest`: list (authenticated only), create (admin only, non-admin gets 403), update, delete, retrieve

3. **`vendors/tests.py`** (14 tests):
   - `BranchModelTest`: creation with fields
   - `VendorModelTest`: display_name with company name, without company name (falls back to full name), fallback to username, M2M categories
   - `EmployeeModelTest`: creation linked to vendor
   - `BranchAPITest`: list and create branches
   - `VendorAPITest`: register vendor (auto-generates password + user), register without company name (display_name = full name), list, filter by category, auto-credentials can login
   - `EmployeeAPITest`: register by owner (auto-generates credentials), auto-credentials login (verifies role=vendor_employee), list employees

4. **`activities/tests.py`** (14 tests):
   - `ActivityModelTest`: creation, is_overdue=True for past pending, is_overdue=False for completed
   - `OccurrenceModelTest`: creation with default status
   - `ActivityAPITest`: create one_time (generates 1 occurrence), create recurring (generates correct number of occurrences every N days), create long_term (1 per day), list, non-admin forbidden, occurrences sub-endpoint
   - `OccurrenceAPITest`: today's occurrences, mark completed (sets completed_by), mark missed, list
   - `WorkLogAPITest`: submit with description, list by occurrence, unauthenticated returns 401

5. **`payments/tests.py`** (8 tests):
   - `PaymentModelTest`: creation with partial status, default status=pending and amount=0
   - `PaymentAPITest`: create (admin only), non-admin forbidden, list, update (partial payment), full lifecycle (pending→partial→completed), filter by status, serializer includes activity_title and vendor_name

**User:** "wait we will run this later" — tests are saved and ready to run with `cd backend && python manage.py test --verbosity=2`

---
