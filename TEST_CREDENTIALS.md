# Test Credentials

All credentials for testing the Vendor Portal system. Passwords have been reset to predictable values for easy testing.

**Backend URL:** `http://localhost:8000`
**Admin Portal URL:** `http://localhost:5173`
**Vendor App:** Flutter Android app (uses `http://10.0.2.2:8000` for emulator)

---

## Admin Users

| Username | Password | Name | Branch |
|---|---|---|---|
| admin_hsr | admin123 | Rajesh Kumar | Orchids HSR Layout |
| admin_whitefield | admin123 | Priya Sharma | Orchids Whitefield |
| admin_sarjapur | admin123 | Amit Singh | Orchids Sarjapur |

> Admins log in to the **React Admin Portal**. Each admin can only see data for their own branch.

---

## Vendor Owners

| Username | Password | Company | Owner Name | Branch | Categories |
|---|---|---|---|---|---|
| vendor_9888703874 | vendor01 | Kumar Facility Services | Ramesh Kumar | Orchids HSR Layout | Facility Maintenance, Infrastructure Repair, Power & Utilities |
| vendor_9899896861 | vendor02 | SparkClean Solutions | Meena Devi | Orchids HSR Layout | Cleaning & Housekeeping, Pest Control, Waste & Sanitation Services |
| vendor_9835710366 | vendor03 | GreenScape Landscaping | Suresh Gowda | Orchids HSR Layout | Grounds & Landscaping, Equipment Maintenance |
| vendor_9836985976 | vendor04 | Patel Technical Works | Jayesh Patel | Orchids Whitefield | Safety & Security Systems, IT & Technical Services, Power & Utilities |
| vendor_9860284937 | vendor05 | CoolAir HVAC Systems | Venkat Reddy | Orchids Whitefield | Facility Maintenance, HVAC & Climate Systems |
| vendor_9841185465 | vendor06 | Reddy Events & Logistics | Lakshmi Reddy | Orchids Whitefield | Event & Facility Setup, Transportation Services |
| vendor_9865898076 | vendor07 | Singh Multi-Services | Harpreet Singh | Orchids Sarjapur | Facility Maintenance, Cleaning & Housekeeping, Infrastructure Repair |
| vendor_9855680993 | vendor08 | Gupta Food & Hygiene | Rohit Gupta | Orchids Sarjapur | Pest Control, Waste & Sanitation Services, Food & Cafeteria Services |
| vendor_9866936550 | vendor09 | TechEdge Solutions | Ananya Nair | Orchids Sarjapur | Safety & Security Systems, IT & Technical Services, Equipment Maintenance |

> Vendor owners log in to the **Flutter Vendor App**. They can see their assigned activities and manage employees.

---

## Vendor Employees

### Orchids HSR Layout

| Username | Password | Name | Works For |
|---|---|---|---|
| emp_9781453723 | emp01 | Arun Kumar | Kumar Facility Services |
| emp_9734179331 | emp02 | Deepak Kumar | Kumar Facility Services |
| emp_9731373177 | emp03 | Kiran Devi | SparkClean Solutions |
| emp_9762991247 | emp04 | Manoj Devi | SparkClean Solutions |
| emp_9765237917 | emp05 | Naveen Gowda | GreenScape Landscaping |
| emp_9717950348 | emp06 | Prakash Gowda | GreenScape Landscaping |

### Orchids Whitefield

| Username | Password | Name | Works For |
|---|---|---|---|
| emp_9747234962 | emp07 | Ravi Patel | Patel Technical Works |
| emp_9788205050 | emp08 | Sanjay Patel | Patel Technical Works |
| emp_9758438156 | emp09 | Vijay Reddy | CoolAir HVAC Systems |
| emp_9754738638 | emp10 | Ganesh Reddy | CoolAir HVAC Systems |
| emp_9782197487 | emp11 | Sunil Reddy | Reddy Events & Logistics |
| emp_9750623625 | emp12 | Ashok Reddy | Reddy Events & Logistics |

### Orchids Sarjapur

| Username | Password | Name | Works For |
|---|---|---|---|
| emp_9766435156 | emp13 | Mohan Singh | Singh Multi-Services |
| emp_9794881918 | emp14 | Rahul Singh | Singh Multi-Services |
| emp_9748965056 | emp15 | Dinesh Gupta | Gupta Food & Hygiene |
| emp_9766526662 | emp16 | Satish Gupta | Gupta Food & Hygiene |
| emp_9791499754 | emp17 | Ramya Nair | TechEdge Solutions |
| emp_9732228923 | emp18 | Kavitha Nair | TechEdge Solutions |

> Employees log in to the **Flutter Vendor App**. They can see today's tasks and submit work logs with before/after photos.

---

## Quick Test Flows

### Admin Portal
1. Open `http://localhost:5173`
2. Login as `admin_hsr` / `admin123`
3. Dashboard shows stats, charts for HSR Layout branch
4. Navigate to Vendors, Activities, Payments, Categories

### Vendor App (Owner)
1. Run Flutter app on Android emulator
2. Login as `vendor_9888703874` / `vendor01`
3. See today's tasks for Kumar Facility Services
4. Open a task, submit work log with photos
5. Navigate to Employees to see/add team members

### Vendor App (Employee)
1. Login as `emp_9781453723` / `emp01`
2. See today's tasks assigned to Kumar Facility Services
3. Open a task and submit a work log

---

## API Login (cURL)

```bash
# Get JWT tokens
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin_hsr", "password": "admin123"}'

# Use the access token
curl http://localhost:8000/api/activities/ \
  -H "Authorization: Bearer <access_token>"
```
