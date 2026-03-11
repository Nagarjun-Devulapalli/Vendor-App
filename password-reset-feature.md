# Password Reset / Forgot Password Feature

## Problem Statement
Currently, there is no way for an employee (or any user) to reset their password if they forget it. The only auth endpoints available are login and token refresh. If a user forgets their password, an admin must manually reset it — there is no self-service flow.

---

## Current Authentication Architecture

### User Model (`accounts/models.py`)
- Extends `AbstractUser` (has built-in password handling)
- Roles: `admin`, `vendor_owner`, `vendor_employee`
- Fields: username, phone, aadhar_number, photo, branch

### Existing Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login/` | POST | Login with username + password |
| `/api/auth/token/refresh/` | POST | Refresh JWT token |
| `/api/auth/profile/` | GET | View user profile |

### What's Missing
- No `POST /forgot-password/` endpoint
- No `POST /reset-password/` endpoint
- No `POST /change-password/` endpoint (for logged-in users)
- No OTP or email-based verification flow

---

## Proposed Solution

Since employees may not have email configured, the reset flow will support **two methods**:
1. **Phone-based OTP reset** — for employees who forgot their password
2. **Admin/Vendor-owner manual reset** — admin or vendor owner resets password for their employee
3. **Change password** — for logged-in users who know their current password

---

## API Endpoints

### 1. Change Password (Logged-in User)
```
POST /api/auth/change-password/
```
- **Auth:** Required (any authenticated user)
- **Body:**
```json
{
  "current_password": "old123",
  "new_password": "new456"
}
```
- **Validations:**
  - Current password must be correct
  - New password must meet minimum requirements (min 8 chars)
  - New password must differ from current password
- **Response:**
```json
{
  "message": "Password changed successfully"
}
```

### 2. Request Password Reset (Forgot Password)
```
POST /api/auth/forgot-password/
```
- **Auth:** None (public endpoint)
- **Body:**
```json
{
  "username": "emp_john",
  "phone": "9876543210"
}
```
- **Flow:**
  1. Verify username + phone combination exists
  2. Generate a 6-digit OTP
  3. Store OTP with expiry (5 minutes) in cache/DB
  4. Send OTP via SMS (or return in response for dev/staging)
- **Response:**
```json
{
  "message": "OTP sent to registered phone number",
  "otp_expiry": 300
}
```

### 3. Verify OTP & Reset Password
```
POST /api/auth/reset-password/
```
- **Auth:** None (public endpoint)
- **Body:**
```json
{
  "username": "emp_john",
  "otp": "482910",
  "new_password": "newpass123"
}
```
- **Validations:**
  - OTP must be valid and not expired
  - New password must meet minimum requirements
- **Response:**
```json
{
  "message": "Password reset successfully"
}
```

### 4. Admin/Vendor Reset Employee Password
```
POST /api/auth/admin-reset-password/
```
- **Auth:** Required (admin or vendor_owner only)
- **Body:**
```json
{
  "user_id": 15,
  "new_password": "temp1234"
}
```
- **Permissions:**
  - Admin can reset any user's password in their branch
  - Vendor owner can only reset their own employees' passwords
- **Response:**
```json
{
  "message": "Password reset successfully for user emp_john"
}
```

---

## New Model: `PasswordResetOTP`

| Field        | Type              | Description                        |
|-------------|-------------------|------------------------------------|
| `user`       | ForeignKey → User | The user requesting reset          |
| `otp`        | CharField(6)      | 6-digit OTP code                   |
| `created_at` | DateTimeField     | When OTP was generated             |
| `expires_at` | DateTimeField     | Expiry time (created_at + 5 mins)  |
| `is_used`    | BooleanField      | Whether OTP has been consumed      |

---

## File Changes

### Backend

| File | Change |
|------|--------|
| `backend/accounts/models.py` | Add `PasswordResetOTP` model |
| `backend/accounts/serializers.py` | Add `ChangePasswordSerializer`, `ForgotPasswordSerializer`, `ResetPasswordSerializer`, `AdminResetPasswordSerializer` |
| `backend/accounts/views.py` | Add `ChangePasswordView`, `ForgotPasswordView`, `ResetPasswordView`, `AdminResetPasswordView` |
| `backend/accounts/urls.py` | Register new password endpoints |
| `backend/accounts/migrations/` | New migration for PasswordResetOTP |

### Frontend (Admin Portal)

| File | Change |
|------|--------|
| `admin-portal/src/pages/VendorDetail.jsx` | Add "Reset Password" button next to each employee |
| Login page | Add "Forgot Password?" link |

### Frontend (Vendor App - Flutter)

| File | Change |
|------|--------|
| Login screen | Add "Forgot Password?" link |
| Forgot password screen | New screen: enter username + phone → OTP → new password |
| Profile/Settings screen | Add "Change Password" option |

---

## Implementation Steps

### Phase 1: Change Password (Logged-in users)
1. Add `ChangePasswordSerializer` in `serializers.py`
2. Add `ChangePasswordView` in `views.py`
3. Register URL `/api/auth/change-password/`

### Phase 2: Admin/Vendor Reset
4. Add `AdminResetPasswordSerializer` in `serializers.py`
5. Add `AdminResetPasswordView` in `views.py`
6. Register URL `/api/auth/admin-reset-password/`
7. Add "Reset Password" button in admin portal employee list

### Phase 3: Forgot Password with OTP
8. Add `PasswordResetOTP` model + migration
9. Add `ForgotPasswordSerializer` and `ResetPasswordSerializer`
10. Add `ForgotPasswordView` and `ResetPasswordView`
11. Register URLs `/api/auth/forgot-password/` and `/api/auth/reset-password/`
12. Integrate SMS service (or use console backend for dev)
13. Add forgot password flow in Flutter app login screen

---

## Security Considerations

- OTP expires after **5 minutes**
- Maximum **3 OTP attempts** before lockout (15-minute cooldown)
- Rate limit forgot-password endpoint to **5 requests per hour per IP**
- OTP is single-use — marked as `is_used` after successful reset
- Admin reset should log the action for audit trail
- Passwords must be minimum **8 characters**
- Old OTPs are invalidated when a new one is generated

---

## Flow Diagrams

### Employee Forgot Password Flow
```
Employee → Forgot Password Screen
    ↓
Enter Username + Phone
    ↓
POST /api/auth/forgot-password/
    ↓
Server validates username+phone → Generates OTP → Sends SMS
    ↓
Employee enters OTP + New Password
    ↓
POST /api/auth/reset-password/
    ↓
Server verifies OTP → Updates password → Returns success
    ↓
Employee logs in with new password
```

### Admin/Vendor Reset Flow
```
Admin/Vendor → Employee List
    ↓
Click "Reset Password" on employee
    ↓
Enter new temporary password
    ↓
POST /api/auth/admin-reset-password/
    ↓
Server resets password → Returns success
    ↓
Inform employee of temporary password
```
