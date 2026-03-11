# Employee-to-Job Assignment Feature

## Problem Statement
Currently, there is no way for a vendor to explicitly assign a specific employee to a specific job/activity. Employees implicitly get linked to activities only when they create a WorkLog. There is no pre-assignment, no task visibility for employees, and no accountability tracking.

---

## Current Architecture

### Models
- **Activity** → assigned to a **Vendor** + **Branch**
- **ActivityOccurrence** → individual instances of an Activity (daily/recurring)
- **WorkLog** → created by an employee when they start work on an occurrence
- **Employee** → belongs to a **Vendor** (via `vendor_owner` FK)

### Current Flow
1. Admin creates an Activity and assigns it to a Vendor
2. Activity occurrences are auto-generated (one-time / daily / recurring)
3. Any employee under that vendor can create a WorkLog on any occurrence
4. No pre-assignment or task delegation by vendor

---

## Proposed Solution

### New Model: `ActivityAssignment`

| Field              | Type                    | Description                                      |
|--------------------|-------------------------|--------------------------------------------------|
| `id`               | BigAutoField (PK)       | Primary key                                      |
| `activity`         | ForeignKey → Activity   | The job/activity being assigned                  |
| `employee`         | ForeignKey → Employee   | The employee being assigned                      |
| `assigned_by`      | ForeignKey → User       | The vendor owner who made the assignment         |
| `assigned_at`      | DateTimeField           | When the assignment was made (auto_now_add)      |
| `status`           | CharField               | `assigned`, `accepted`, `declined`, `removed`    |
| `note`             | TextField (optional)    | Any instructions from the vendor to the employee |

**Constraints:**
- Unique together: (`activity`, `employee`) — prevent duplicate assignments
- Employee must belong to the same vendor as the activity's vendor

### File Changes

#### Backend

| File | Change |
|------|--------|
| `backend/activities/models.py` | Add `ActivityAssignment` model |
| `backend/activities/serializers.py` | Add `ActivityAssignmentSerializer` |
| `backend/activities/views.py` | Add `ActivityAssignmentViewSet` |
| `backend/activities/urls.py` | Register `/activity-assignments/` route |
| `backend/activities/migrations/` | New migration for ActivityAssignment table |

#### Frontend (Admin Portal)

| File | Change |
|------|--------|
| `admin-portal/src/pages/ActivityDetail.jsx` | Show assigned employees list per activity |

#### Frontend (Vendor App - Flutter)

| File | Change |
|------|--------|
| Vendor dashboard screen | Add "Assign Employee" action on activities |
| Employee dashboard screen | Show "My Assigned Tasks" list |

---

## API Endpoints

### 1. List Assignments
```
GET /api/activity-assignments/
```
- **Query Params:** `activity_id`, `employee_id`
- **Permissions:** Admin sees all (filtered by branch), Vendor sees own, Employee sees self
- **Response:** List of assignments with activity and employee details

### 2. Create Assignment (Vendor assigns employee to job)
```
POST /api/activity-assignments/
```
- **Body:**
```json
{
  "activity": 1,
  "employee": 5,
  "note": "Please complete by morning shift"
}
```
- **Permissions:** Vendor owner only (must own both the activity and the employee)
- **Validations:**
  - Employee must belong to the vendor
  - Activity must belong to the vendor
  - No duplicate assignment for same activity + employee

### 3. Update Assignment
```
PATCH /api/activity-assignments/{id}/
```
- **Body:** `status`, `note`
- **Permissions:** Vendor owner can update status/note; Employee can accept/decline

### 4. Remove Assignment
```
DELETE /api/activity-assignments/{id}/
```
- **Permissions:** Vendor owner only

### 5. Bulk Assign (Optional)
```
POST /api/activity-assignments/bulk/
```
- **Body:**
```json
{
  "activity": 1,
  "employees": [5, 6, 7]
}
```
- **Permissions:** Vendor owner only

### 6. My Assignments (Employee view)
```
GET /api/activity-assignments/my-assignments/
```
- **Permissions:** Employee only
- **Response:** List of activities assigned to the logged-in employee

---

## Business Rules

1. **Only vendor owners** can assign employees to activities
2. Employee must belong to the **same vendor** as the activity
3. An employee can be assigned to **multiple activities**
4. An activity can have **multiple employees** assigned
5. WorkLog creation should **optionally validate** that the employee is assigned to the activity
6. Admins can **view** all assignments but cannot create them (vendors manage their own workforce)

---

## Implementation Steps

### Phase 1: Backend Model + API
1. Create `ActivityAssignment` model in `activities/models.py`
2. Create serializer in `activities/serializers.py`
3. Create viewset in `activities/views.py` with proper permission checks
4. Register URL in `activities/urls.py`
5. Generate and run migration

### Phase 2: Admin Portal (View Only)
6. Update `ActivityDetail.jsx` to show assigned employees for each activity
7. Show assignment status alongside work logs

### Phase 3: Vendor App (Flutter - Full CRUD)
8. Add assignment UI in vendor's activity detail screen
9. Add "My Tasks" screen for employees
10. Add accept/decline flow for employees

### Phase 4: Validation Integration
11. Optionally enforce assignment check when creating WorkLogs
12. Add assignment-based filtering for employee's available occurrences

---

## Database Diagram (New Relationships)

```
Vendor ──────┐
  │          │
  │ has many │ has many
  ▼          ▼
Employee   Activity
  │          │
  └──────────┘
       │
  ActivityAssignment
  (employee, activity, assigned_by, status, note)
       │
       ▼
  ActivityOccurrence
       │
       ▼
    WorkLog (employee works on occurrence)
```

---

## Notes
- This feature does NOT change the existing WorkLog flow — it adds a layer of assignment on top
- The assignment is at the **Activity level**, not at the ActivityOccurrence level (employee is assigned to the whole job, not individual daily occurrences)
- Future enhancement: assignment at occurrence level for shift-based scheduling
