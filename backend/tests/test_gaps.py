"""
Gap-filling tests that cover untested endpoints, edge cases, permissions,
serializer logic, model methods, and error handling across all apps.
"""
import struct
import zlib
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from vendors.models import Branch, Vendor, Employee
from categories.models import WorkCategory
from activities.models import Activity, ActivityOccurrence, WorkLog
from payments.models import Payment

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin(branch=None, username='admin_gap', password='adminpass'):
    return User.objects.create_user(
        username=username, password=password,
        first_name='Admin', last_name='Gap',
        role='admin', branch=branch,
    )


def _vendor_with_user(branch, username='vendor_gap', password='vendorpass'):
    user = User.objects.create_user(
        username=username, password=password,
        first_name='Vendor', last_name='Gap',
        role='vendor_owner', branch=branch,
    )
    vendor = Vendor.objects.create(user=user, branch=branch)
    return user, vendor


def _employee_with_user(vendor, username='emp_gap', password='emppass'):
    user = User.objects.create_user(
        username=username, password=password,
        first_name='Emp', last_name='Gap',
        role='vendor_employee', branch=vendor.branch,
    )
    emp = Employee.objects.create(user=user, vendor_owner=vendor)
    return user, emp


def _login(client, username, password):
    resp = client.post('/api/auth/login/', {'username': username, 'password': password})
    if resp.status_code == 200:
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return resp


def _png():
    raw = b'\x00\xff\x00\x00'
    scanline = b'\x00' + raw[:3]
    deflated = zlib.compress(scanline)
    png = b'\x89PNG\r\n\x1a\n'
    def chunk(ct, d):
        c = ct + d
        crc = struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack('>I', len(d)) + c + crc
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', deflated)
    png += chunk(b'IEND', b'')
    return SimpleUploadedFile('img.png', png, content_type='image/png')


# ===========================================================================
# 1. TOKEN REFRESH
# ===========================================================================

class TokenRefreshTest(TestCase):
    """JWT token refresh endpoint – completely untested before."""

    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='B', city='C')
        _admin(self.branch)

    def test_refresh_returns_new_access_token(self):
        login = self.client.post('/api/auth/login/', {'username': 'admin_gap', 'password': 'adminpass'})
        refresh_token = login.data['refresh']
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': refresh_token})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        # New access token should work
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        profile = self.client.get('/api/auth/profile/')
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

    def test_refresh_with_invalid_token(self):
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': 'invalid.token.here'})
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_refresh_with_empty_body(self):
        resp = self.client.post('/api/auth/token/refresh/', {})
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])


# ===========================================================================
# 2. LOGIN EDGE CASES
# ===========================================================================

class LoginEdgeCaseTest(TestCase):
    """Login edge cases not covered by existing tests."""

    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='B', city='C')
        self.user = _admin(self.branch)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        resp = self.client.post('/api/auth/login/', {'username': 'admin_gap', 'password': 'adminpass'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_empty_credentials(self):
        resp = self.client.post('/api/auth/login/', {'username': '', 'password': ''})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_branch_info(self):
        resp = _login(self.client, 'admin_gap', 'adminpass')
        self.assertEqual(resp.data['user']['branch'], self.branch.id)
        self.assertEqual(resp.data['user']['branch_name'], self.branch.name)

    def test_login_user_without_branch(self):
        User.objects.create_user(username='nobranchuser', password='pass', role='admin')
        resp = self.client.post('/api/auth/login/', {'username': 'nobranchuser', 'password': 'pass'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data['user']['branch'])
        self.assertIsNone(resp.data['user']['branch_name'])


# ===========================================================================
# 3. PROFILE SERIALIZER – vendor_id logic
# ===========================================================================

class ProfileVendorIdTest(TestCase):
    """Test ProfileSerializer.get_vendor_id() for each role."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')

    def test_admin_profile_vendor_id_is_none(self):
        admin = _admin(self.branch)
        client = APIClient()
        _login(client, 'admin_gap', 'adminpass')
        resp = client.get('/api/auth/profile/')
        self.assertIsNone(resp.data['vendor_id'])

    def test_vendor_owner_profile_has_vendor_id(self):
        user, vendor = _vendor_with_user(self.branch)
        client = APIClient()
        _login(client, 'vendor_gap', 'vendorpass')
        resp = client.get('/api/auth/profile/')
        self.assertEqual(resp.data['vendor_id'], vendor.id)

    def test_employee_profile_has_vendor_owner_id(self):
        _, vendor = _vendor_with_user(self.branch)
        emp_user, emp = _employee_with_user(vendor)
        client = APIClient()
        _login(client, 'emp_gap', 'emppass')
        resp = client.get('/api/auth/profile/')
        self.assertEqual(resp.data['vendor_id'], vendor.id)


# ===========================================================================
# 4. MODEL __str__ METHODS
# ===========================================================================

class ModelStrTests(TestCase):
    """All model __str__ methods."""

    def setUp(self):
        self.branch = Branch.objects.create(name='Downtown', city='Metro')
        self.user = User.objects.create_user(username='testuser', role='admin')
        self.vendor_user = User.objects.create_user(
            username='vuser', first_name='Raj', last_name='K', role='vendor_owner',
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, branch=self.branch, company_name='Raj Co',
        )

    def test_user_str(self):
        self.assertEqual(str(self.user), 'testuser (admin)')

    def test_branch_str(self):
        self.assertEqual(str(self.branch), 'Downtown')

    def test_vendor_str(self):
        self.assertEqual(str(self.vendor), 'Raj Co')

    def test_vendor_str_fallback_fullname(self):
        v = Vendor.objects.create(
            user=User.objects.create_user(
                username='v2', first_name='Sita', last_name='Devi', role='vendor_owner',
            ),
            branch=self.branch, company_name='',
        )
        self.assertEqual(str(v), 'Sita Devi')

    def test_vendor_str_fallback_username(self):
        v = Vendor.objects.create(
            user=User.objects.create_user(username='v3', role='vendor_owner'),
            branch=self.branch, company_name='',
        )
        self.assertEqual(str(v), 'v3')

    def test_employee_str(self):
        emp_user = User.objects.create_user(
            username='emp1', first_name='Sita', last_name='Devi', role='vendor_employee',
        )
        emp = Employee.objects.create(user=emp_user, vendor_owner=self.vendor)
        self.assertEqual(str(emp), 'Sita Devi (Employee of Raj Co)')

    def test_category_str(self):
        cat = WorkCategory.objects.create(name='Plumbing')
        self.assertEqual(str(cat), 'Plumbing')

    def test_activity_str(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Fix pipes',
            activity_type='one_time', start_date=date.today(),
        )
        self.assertEqual(str(act), 'Fix pipes')

    def test_occurrence_str(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Fix pipes',
            activity_type='one_time', start_date=date.today(),
        )
        occ = ActivityOccurrence.objects.create(activity=act, scheduled_date=date.today())
        self.assertEqual(str(occ), f'Fix pipes - {date.today()}')

    def test_worklog_str(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Fix pipes',
            activity_type='one_time', start_date=date.today(),
        )
        occ = ActivityOccurrence.objects.create(activity=act, scheduled_date=date.today())
        wl = WorkLog.objects.create(occurrence=occ, user=self.user)
        self.assertIn('WorkLog for', str(wl))

    def test_payment_str(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Fix pipes',
            activity_type='one_time', start_date=date.today(),
        )
        pay = Payment.objects.create(activity=act, expected_amount=Decimal('1000'))
        self.assertEqual(str(pay), 'Payment for Fix pipes - pending')


# ===========================================================================
# 5. BRANCH CRUD GAPS (PATCH, DELETE, retrieve)
# ===========================================================================

class BranchCRUDTest(TestCase):
    """PATCH, DELETE, and single-retrieve for branches."""

    def setUp(self):
        self.branch = Branch.objects.create(name='HQ', city='Metro')
        self.admin = _admin(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_retrieve_single_branch(self):
        resp = self.client.get(f'/api/branches/{self.branch.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['name'], 'HQ')

    def test_patch_branch(self):
        resp = self.client.patch(f'/api/branches/{self.branch.id}/', {'name': 'New HQ'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.branch.refresh_from_db()
        self.assertEqual(self.branch.name, 'New HQ')

    def test_delete_branch(self):
        extra = Branch.objects.create(name='Temp', city='C')
        resp = self.client.delete(f'/api/branches/{extra.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Branch.objects.filter(id=extra.id).exists())

    def test_vendor_cannot_create_branch(self):
        vu, _ = _vendor_with_user(self.branch)
        client = APIClient()
        _login(client, 'vendor_gap', 'vendorpass')
        resp = client.post('/api/branches/', {'name': 'X', 'city': 'Y'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_can_read_branches(self):
        vu, _ = _vendor_with_user(self.branch)
        client = APIClient()
        _login(client, 'vendor_gap', 'vendorpass')
        resp = client.get('/api/branches/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_retrieve_nonexistent_branch_404(self):
        resp = self.client.get('/api/branches/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 6. VENDOR CRUD GAPS (PATCH, DELETE, retrieve, filtering)
# ===========================================================================

class VendorCRUDTest(TestCase):
    """Update, delete, single-retrieve for vendors."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_retrieve_single_vendor(self):
        resp = self.client.get(f'/api/vendors/{self.vendor.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], self.vendor.id)

    def test_patch_vendor_company_name(self):
        resp = self.client.patch(
            f'/api/vendors/{self.vendor.id}/',
            {'company_name': 'Updated Co'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.company_name, 'Updated Co')

    def test_delete_vendor(self):
        user2, vendor2 = _vendor_with_user(self.branch, username='vendor2')
        resp = self.client.delete(f'/api/vendors/{vendor2.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Vendor.objects.filter(id=vendor2.id).exists())

    def test_vendor_cannot_update_own_vendor(self):
        client = APIClient()
        _login(client, 'vendor_gap', 'vendorpass')
        resp = client.patch(
            f'/api/vendors/{self.vendor.id}/',
            {'company_name': 'Hack'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_cannot_delete_vendor(self):
        client = APIClient()
        _login(client, 'vendor_gap', 'vendorpass')
        resp = client.delete(f'/api/vendors/{self.vendor.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_query_param_filter(self):
        _, vendor2 = _vendor_with_user(self.branch, username='vendor2')
        resp = self.client.get(f'/api/vendors/?vendor={self.vendor.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [v['id'] for v in resp.data]
        self.assertIn(self.vendor.id, ids)
        self.assertNotIn(vendor2.id, ids)

    def test_retrieve_nonexistent_vendor_404(self):
        resp = self.client.get('/api/vendors/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_by_category_empty_result(self):
        cat = WorkCategory.objects.create(name='Unused')
        resp = self.client.get(f'/api/vendors/by-category/?cat={cat.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_by_category_missing_param(self):
        resp = self.client.get('/api/vendors/by-category/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# 7. EMPLOYEE CRUD GAPS (PATCH, DELETE, retrieve, permissions)
# ===========================================================================

class EmployeeCRUDTest(TestCase):
    """Update, delete, single-retrieve for employees + permission tests."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.emp_user, self.emp = _employee_with_user(self.vendor)
        self.admin_client = APIClient()
        self.vendor_client = APIClient()
        self.emp_client = APIClient()
        _login(self.admin_client, 'admin_gap', 'adminpass')
        _login(self.vendor_client, 'vendor_gap', 'vendorpass')
        _login(self.emp_client, 'emp_gap', 'emppass')

    def test_retrieve_single_employee(self):
        resp = self.admin_client.get(f'/api/employees/{self.emp.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], self.emp.id)

    def test_vendor_owner_sees_own_employees(self):
        resp = self.vendor_client.get('/api/employees/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [e['id'] for e in resp.data]
        self.assertIn(self.emp.id, ids)

    def test_employee_sees_only_self(self):
        resp = self.emp_client.get('/api/employees/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [e['id'] for e in resp.data]
        self.assertEqual(ids, [self.emp.id])

    def test_filter_by_vendor_owner(self):
        resp = self.admin_client.get(f'/api/employees/?vendor_owner={self.vendor.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for e in resp.data:
            self.assertEqual(e['vendor_owner'], self.vendor.id)

    def test_delete_employee(self):
        emp_user2, emp2 = _employee_with_user(self.vendor, username='emp2')
        resp = self.admin_client.delete(f'/api/employees/{emp2.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Employee.objects.filter(id=emp2.id).exists())

    def test_patch_employee(self):
        # Employees can be updated (no explicit permission restriction in code)
        resp = self.admin_client.patch(
            f'/api/employees/{self.emp.id}/',
            {'vendor_owner': self.vendor.id},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_retrieve_nonexistent_employee_404(self):
        resp = self.admin_client.get('/api/employees/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 8. CATEGORY EDGE CASES
# ===========================================================================

class CategoryEdgeCaseTest(TestCase):
    """Category edge cases: duplicate names, non-admin PATCH/DELETE."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_duplicate_category_name_fails(self):
        self.client.post('/api/categories/', {'name': 'Plumbing'})
        resp = self.client.post('/api/categories/', {'name': 'Plumbing'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendor_cannot_patch_category(self):
        cat = WorkCategory.objects.create(name='X')
        vu, _ = _vendor_with_user(self.branch)
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.patch(f'/api/categories/{cat.id}/', {'name': 'Y'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_cannot_delete_category(self):
        cat = WorkCategory.objects.create(name='Del')
        vu, _ = _vendor_with_user(self.branch)
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.delete(f'/api/categories/{cat.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_category_name(self):
        cat = WorkCategory.objects.create(name='Old')
        resp = self.client.patch(f'/api/categories/{cat.id}/', {'name': 'New'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cat.refresh_from_db()
        self.assertEqual(cat.name, 'New')

    def test_retrieve_nonexistent_category_404(self):
        resp = self.client.get('/api/categories/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 9. ACTIVITY CRUD GAPS (retrieve, PATCH, DELETE, query filters)
# ===========================================================================

class ActivityCRUDTest(TestCase):
    """Single retrieve, update, delete, and query filtering for activities."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Test Act',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('1000'), status='pending',
        )

    def test_retrieve_single_activity(self):
        resp = self.client.get(f'/api/activities/{self.activity.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Test Act')

    def test_patch_activity_title(self):
        resp = self.client.patch(
            f'/api/activities/{self.activity.id}/',
            {'title': 'Updated Title'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.title, 'Updated Title')

    def test_patch_activity_status(self):
        resp = self.client.patch(
            f'/api/activities/{self.activity.id}/',
            {'status': 'in_progress'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.status, 'in_progress')

    def test_delete_activity(self):
        resp = self.client.delete(f'/api/activities/{self.activity.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Activity.objects.filter(id=self.activity.id).exists())

    def test_vendor_cannot_update_activity(self):
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.patch(
            f'/api/activities/{self.activity.id}/',
            {'title': 'Hack'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_cannot_delete_activity(self):
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.delete(f'/api/activities/{self.activity.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_filter_by_status(self):
        Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Done',
            activity_type='one_time', start_date=date.today(), status='completed',
        )
        resp = self.client.get('/api/activities/?status=pending')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(all(a['status'] == 'pending' for a in resp.data))

    def test_filter_by_activity_type(self):
        Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Recurring',
            activity_type='recurring', start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            recurrence_interval_days=7,
        )
        resp = self.client.get('/api/activities/?activity_type=recurring')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(all(a['activity_type'] == 'recurring' for a in resp.data))

    def test_filter_by_vendor(self):
        _, vendor2 = _vendor_with_user(self.branch, username='vendor2')
        Activity.objects.create(
            branch=self.branch, vendor=vendor2, title='Other',
            activity_type='one_time', start_date=date.today(),
        )
        resp = self.client.get(f'/api/activities/?vendor={self.vendor.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(all(a['vendor'] == self.vendor.id for a in resp.data))

    def test_retrieve_nonexistent_activity_404(self):
        resp = self.client.get('/api/activities/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_cascades_occurrences(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Cascade',
            activity_type='one_time', start_date=date.today(),
        )
        occ = ActivityOccurrence.objects.create(activity=act, scheduled_date=date.today())
        occ_id = occ.id
        self.client.delete(f'/api/activities/{act.id}/')
        self.assertFalse(ActivityOccurrence.objects.filter(id=occ_id).exists())


# ===========================================================================
# 10. ACTIVITY MODEL – is_overdue edge cases
# ===========================================================================

class ActivityOverdueTest(TestCase):
    """is_overdue property boundary conditions."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        vu, self.vendor = _vendor_with_user(self.branch)

    def _make(self, end_date, act_status='pending'):
        return Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='T',
            activity_type='one_time', start_date=date.today(),
            end_date=end_date, status=act_status,
        )

    def test_overdue_when_end_date_past(self):
        act = self._make(end_date=date.today() - timedelta(days=1))
        self.assertTrue(act.is_overdue)

    def test_not_overdue_when_end_date_today(self):
        act = self._make(end_date=date.today())
        self.assertFalse(act.is_overdue)

    def test_not_overdue_when_end_date_future(self):
        act = self._make(end_date=date.today() + timedelta(days=5))
        self.assertFalse(act.is_overdue)

    def test_not_overdue_when_completed(self):
        act = self._make(end_date=date.today() - timedelta(days=1), act_status='completed')
        self.assertFalse(act.is_overdue)

    def test_not_overdue_when_cancelled(self):
        act = self._make(end_date=date.today() - timedelta(days=1), act_status='cancelled')
        self.assertFalse(act.is_overdue)

    def test_not_overdue_when_no_end_date(self):
        act = self._make(end_date=None)
        self.assertFalse(act.is_overdue)


# ===========================================================================
# 11. OCCURRENCE EDGE CASES
# ===========================================================================

class OccurrenceEdgeCaseTest(TestCase):
    """Occurrence update, today with no results, status transitions."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
        )

    def test_today_returns_empty_when_no_occurrences(self):
        resp = self.client.get('/api/occurrences/today/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_today_excludes_other_dates(self):
        ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today() + timedelta(days=1),
        )
        resp = self.client.get('/api/occurrences/today/')
        self.assertEqual(len(resp.data), 0)

    def test_patch_occurrence_to_missed(self):
        occ = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )
        resp = self.client.patch(f'/api/occurrences/{occ.id}/', {'status': 'missed'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        occ.refresh_from_db()
        self.assertEqual(occ.status, 'missed')

    def test_patch_occurrence_to_completed_sets_completed_by(self):
        occ = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )
        resp = self.client.patch(f'/api/occurrences/{occ.id}/', {'status': 'completed'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        occ.refresh_from_db()
        self.assertEqual(occ.completed_by, self.admin)
        self.assertIsNotNone(occ.completed_at)

    def test_occurrence_list_returns_all(self):
        ActivityOccurrence.objects.create(activity=self.activity, scheduled_date=date.today())
        ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today() + timedelta(days=1),
        )
        resp = self.client.get('/api/occurrences/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_retrieve_nonexistent_occurrence_404(self):
        resp = self.client.get('/api/occurrences/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 12. WORK LOG EDGE CASES
# ===========================================================================

class WorkLogEdgeCaseTest(TestCase):
    """Work log retrieve, complete without photo, review edge cases."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.admin_client = APIClient()
        self.vendor_client = APIClient()
        _login(self.admin_client, 'admin_gap', 'adminpass')
        _login(self.vendor_client, 'vendor_gap', 'vendorpass')

        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
        )
        self.occurrence = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )

    def test_retrieve_single_work_log(self):
        wl = WorkLog.objects.create(
            occurrence=self.occurrence, user=self.vendor_user,
            status='in_progress', description='test',
        )
        resp = self.vendor_client.get(f'/api/work-logs/{wl.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], wl.id)

    def test_complete_without_photo_fails(self):
        wl = WorkLog.objects.create(
            occurrence=self.occurrence, user=self.vendor_user,
            status='in_progress',
        )
        resp = self.vendor_client.patch(f'/api/work-logs/{wl.id}/complete/', {}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('after_photo', str(resp.data))

    def test_review_with_invalid_status_fails(self):
        wl = WorkLog.objects.create(
            occurrence=self.occurrence, user=self.vendor_user,
            status='completed',
        )
        resp = self.admin_client.patch(
            f'/api/work-logs/{wl.id}/review/',
            {'approval_status': 'invalid'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_cannot_review_work_log(self):
        emp_user, _ = _employee_with_user(self.vendor)
        emp_client = APIClient()
        _login(emp_client, 'emp_gap', 'emppass')

        wl = WorkLog.objects.create(
            occurrence=self.occurrence, user=self.vendor_user,
            status='completed',
        )
        resp = emp_client.patch(
            f'/api/work-logs/{wl.id}/review/',
            {'approval_status': 'approved'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_work_log_without_photo(self):
        resp = self.vendor_client.post('/api/work-logs/', {
            'occurrence': self.occurrence.id,
            'description': 'No photo',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertFalse(resp.data['before_photo'])

    def test_work_log_filter_by_occurrence(self):
        WorkLog.objects.create(occurrence=self.occurrence, user=self.vendor_user)
        occ2 = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today() + timedelta(days=1),
        )
        WorkLog.objects.create(occurrence=occ2, user=self.vendor_user)

        resp = self.vendor_client.get(f'/api/work-logs/?occurrence={self.occurrence.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(all(wl['occurrence'] == self.occurrence.id for wl in resp.data))

    def test_retrieve_nonexistent_work_log_404(self):
        resp = self.vendor_client.get('/api/work-logs/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 13. PAYMENT CRUD GAPS (retrieve, DELETE, receipt upload)
# ===========================================================================

class PaymentCRUDTest(TestCase):
    """Single retrieve, delete, and receipt upload for payments."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('5000'),
        )
        self.payment = Payment.objects.create(
            activity=self.activity, expected_amount=Decimal('5000'),
        )

    def test_retrieve_single_payment(self):
        resp = self.client.get(f'/api/payments/{self.payment.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], self.payment.id)
        self.assertEqual(resp.data['activity_title'], 'Act')

    def test_delete_payment(self):
        resp = self.client.delete(f'/api/payments/{self.payment.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Payment.objects.filter(id=self.payment.id).exists())

    def test_vendor_cannot_update_payment(self):
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.patch(
            f'/api/payments/{self.payment.id}/',
            {'payment_status': 'completed'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_cannot_delete_payment(self):
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.delete(f'/api/payments/{self.payment.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_can_read_own_payments(self):
        vclient = APIClient()
        _login(vclient, 'vendor_gap', 'vendorpass')
        resp = vclient.get('/api/payments/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [p['id'] for p in resp.data]
        self.assertIn(self.payment.id, ids)

    def test_retrieve_nonexistent_payment_404(self):
        resp = self.client.get('/api/payments/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 14. RECEIPT UPLOAD – completely untested before
# ===========================================================================

class ReceiptUploadTest(TestCase):
    """Payment receipt upload endpoint tests."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('5000'),
        )
        self.payment = Payment.objects.create(
            activity=self.activity, expected_amount=Decimal('5000'),
        )

    def test_upload_receipt_success(self):
        receipt = SimpleUploadedFile('receipt.pdf', b'%PDF-1.4 fake', content_type='application/pdf')
        resp = self.client.post(
            f'/api/payments/{self.payment.id}/upload-receipt/',
            {'receipt': receipt},
            format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('receipt', resp.data)
        self.payment.refresh_from_db()
        self.assertTrue(self.payment.receipt)

    def test_upload_receipt_no_file_fails(self):
        resp = self.client.post(
            f'/api/payments/{self.payment.id}/upload-receipt/',
            {},
            format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_receipt_replaces_existing(self):
        r1 = SimpleUploadedFile('r1.pdf', b'%PDF-1', content_type='application/pdf')
        self.client.post(
            f'/api/payments/{self.payment.id}/upload-receipt/',
            {'receipt': r1}, format='multipart',
        )
        r2 = SimpleUploadedFile('r2.pdf', b'%PDF-2', content_type='application/pdf')
        resp = self.client.post(
            f'/api/payments/{self.payment.id}/upload-receipt/',
            {'receipt': r2}, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertIn('r2', self.payment.receipt.name)


# ===========================================================================
# 15. PAYMENT SERIALIZER – auto-fill edge cases
# ===========================================================================

class PaymentSerializerEdgeCaseTest(TestCase):
    """Payment serializer auto-fill and edge cases."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_autofill_expected_amount_from_activity(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('8000'),
        )
        resp = self.client.post('/api/payments/', {
            'activity': act.id,
            'expected_amount': 0,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(resp.data['expected_amount'])), Decimal('8000.00'))

    def test_explicit_expected_amount_preserved(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('8000'),
        )
        resp = self.client.post('/api/payments/', {
            'activity': act.id,
            'expected_amount': '3000.00',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(resp.data['expected_amount'])), Decimal('3000.00'))

    def test_payment_with_notes(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('1000'),
        )
        resp = self.client.post('/api/payments/', {
            'activity': act.id,
            'expected_amount': '1000',
            'notes': 'First installment for the project',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['notes'], 'First installment for the project')


# ===========================================================================
# 16. VENDOR SERIALIZER EDGE CASES
# ===========================================================================

class VendorSerializerEdgeCaseTest(TestCase):
    """Vendor creation edge cases: no phone, no names, credentials not re-exposed."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_create_vendor_without_phone_uses_random_username(self):
        resp = self.client.post('/api/vendors/', {
            'branch': self.branch.id,
            'first_name': 'NoPhone',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('credentials', resp.data)
        self.assertTrue(resp.data['credentials']['username'].startswith('vendor_'))

    def test_create_vendor_without_names(self):
        resp = self.client.post('/api/vendors/', {
            'branch': self.branch.id,
            'phone': '1111111111',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_credentials_not_shown_on_list(self):
        self.client.post('/api/vendors/', {
            'branch': self.branch.id,
            'phone': '2222222222',
        }, format='json')
        resp = self.client.get('/api/vendors/')
        for v in resp.data:
            self.assertNotIn('credentials', v)

    def test_credentials_not_shown_on_retrieve(self):
        create_resp = self.client.post('/api/vendors/', {
            'branch': self.branch.id,
            'phone': '3333333333',
        }, format='json')
        vendor_id = create_resp.data['id']
        resp = self.client.get(f'/api/vendors/{vendor_id}/')
        self.assertNotIn('credentials', resp.data)


# ===========================================================================
# 17. EMPLOYEE SERIALIZER EDGE CASES
# ===========================================================================

class EmployeeSerializerEdgeCaseTest(TestCase):
    """Employee creation edge cases."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_employee_inherits_vendor_branch(self):
        resp = self.client.post('/api/employees/', {
            'vendor_owner': self.vendor.id,
            'first_name': 'Test',
            'phone': '5555555555',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        username = resp.data['credentials']['username']
        user = User.objects.get(username=username)
        self.assertEqual(user.branch, self.branch)

    def test_create_employee_without_phone(self):
        resp = self.client.post('/api/employees/', {
            'vendor_owner': self.vendor.id,
            'first_name': 'NoPhone',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['credentials']['username'].startswith('emp_'))

    def test_credentials_not_shown_on_list(self):
        self.client.post('/api/employees/', {
            'vendor_owner': self.vendor.id, 'phone': '7777777777',
        })
        resp = self.client.get('/api/employees/')
        for e in resp.data:
            self.assertNotIn('credentials', e)


# ===========================================================================
# 18. OCCURRENCE GENERATION EDGE CASES
# ===========================================================================

class OccurrenceGenerationEdgeCaseTest(TestCase):
    """Edge cases for generate_occurrences()."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_one_time_generates_single_occurrence(self):
        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'Once',
            'activity_type': 'one_time', 'start_date': str(date.today()),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        occs = ActivityOccurrence.objects.filter(activity_id=resp.data['id'])
        self.assertEqual(occs.count(), 1)
        self.assertEqual(occs.first().scheduled_date, date.today())

    def test_long_term_start_equals_end_generates_one(self):
        today = date.today()
        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'Same day',
            'activity_type': 'long_term',
            'start_date': str(today), 'end_date': str(today),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        occs = ActivityOccurrence.objects.filter(activity_id=resp.data['id'])
        self.assertEqual(occs.count(), 1)

    def test_recurring_without_end_date_no_occurrences(self):
        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'No end',
            'activity_type': 'recurring',
            'start_date': str(date.today()),
            'recurrence_interval_days': 7,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        occs = ActivityOccurrence.objects.filter(activity_id=resp.data['id'])
        self.assertEqual(occs.count(), 0)

    def test_recurring_without_interval_no_occurrences(self):
        today = date.today()
        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'No interval',
            'activity_type': 'recurring',
            'start_date': str(today),
            'end_date': str(today + timedelta(days=30)),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        occs = ActivityOccurrence.objects.filter(activity_id=resp.data['id'])
        self.assertEqual(occs.count(), 0)

    def test_long_term_without_end_date_no_occurrences(self):
        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'No end',
            'activity_type': 'long_term',
            'start_date': str(date.today()),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        occs = ActivityOccurrence.objects.filter(activity_id=resp.data['id'])
        self.assertEqual(occs.count(), 0)

    def test_activity_with_no_occurrences_returns_empty(self):
        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'Empty',
            'activity_type': 'recurring',
            'start_date': str(date.today()),
        })
        act_id = resp.data['id']
        occ_resp = self.client.get(f'/api/activities/{act_id}/occurrences/')
        self.assertEqual(occ_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(occ_resp.data), 0)


# ===========================================================================
# 19. CASCADE DELETION TESTS
# ===========================================================================

class CascadeDeletionTest(TestCase):
    """Verify cascade behavior when parent objects are deleted."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.vendor_user, self.vendor = _vendor_with_user(self.branch)

    def test_deleting_vendor_cascades_to_activities(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='T',
            activity_type='one_time', start_date=date.today(),
        )
        act_id = act.id
        self.vendor.delete()
        self.assertFalse(Activity.objects.filter(id=act_id).exists())

    def test_deleting_activity_cascades_to_payments(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='T',
            activity_type='one_time', start_date=date.today(),
        )
        pay = Payment.objects.create(activity=act, expected_amount=Decimal('1000'))
        pay_id = pay.id
        act.delete()
        self.assertFalse(Payment.objects.filter(id=pay_id).exists())

    def test_deleting_occurrence_cascades_to_work_logs(self):
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='T',
            activity_type='one_time', start_date=date.today(),
        )
        occ = ActivityOccurrence.objects.create(activity=act, scheduled_date=date.today())
        wl = WorkLog.objects.create(occurrence=occ, user=self.vendor_user)
        wl_id = wl.id
        occ.delete()
        self.assertFalse(WorkLog.objects.filter(id=wl_id).exists())

    def test_deleting_vendor_cascades_to_employees(self):
        emp_user, emp = _employee_with_user(self.vendor)
        emp_id = emp.id
        self.vendor.delete()
        self.assertFalse(Employee.objects.filter(id=emp_id).exists())

    def test_deleting_branch_cascades_to_vendors(self):
        vendor_id = self.vendor.id
        self.branch.delete()
        self.assertFalse(Vendor.objects.filter(id=vendor_id).exists())

    def test_deleting_branch_sets_user_branch_null(self):
        admin = _admin(self.branch)
        branch_id = self.branch.id
        self.branch.delete()
        admin.refresh_from_db()
        self.assertIsNone(admin.branch)

    def test_deleting_category_sets_activity_category_null(self):
        cat = WorkCategory.objects.create(name='Cat')
        act = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='T',
            activity_type='one_time', start_date=date.today(),
            category=cat,
        )
        cat.delete()
        act.refresh_from_db()
        self.assertIsNone(act.category)


# ===========================================================================
# 20. DATA ISOLATION (cross-vendor, cross-branch)
# ===========================================================================

class DataIsolationTest(TestCase):
    """Vendors and employees can only see their own data."""

    def setUp(self):
        self.branch1 = Branch.objects.create(name='B1', city='C')
        self.branch2 = Branch.objects.create(name='B2', city='C')
        self.vendor_user1, self.vendor1 = _vendor_with_user(self.branch1, username='v1')
        self.vendor_user2, self.vendor2 = _vendor_with_user(self.branch2, username='v2')
        self.emp_user1, self.emp1 = _employee_with_user(self.vendor1, username='e1')

        self.act1 = Activity.objects.create(
            branch=self.branch1, vendor=self.vendor1, title='V1 Act',
            activity_type='one_time', start_date=date.today(),
        )
        self.act2 = Activity.objects.create(
            branch=self.branch2, vendor=self.vendor2, title='V2 Act',
            activity_type='one_time', start_date=date.today(),
        )
        self.occ1 = ActivityOccurrence.objects.create(
            activity=self.act1, scheduled_date=date.today(),
        )
        self.occ2 = ActivityOccurrence.objects.create(
            activity=self.act2, scheduled_date=date.today(),
        )
        Payment.objects.create(activity=self.act1, expected_amount=1000)
        Payment.objects.create(activity=self.act2, expected_amount=2000)

        self.v1_client = APIClient()
        self.v2_client = APIClient()
        self.e1_client = APIClient()
        _login(self.v1_client, 'v1', 'vendorpass')
        _login(self.v2_client, 'v2', 'vendorpass')
        _login(self.e1_client, 'e1', 'emppass')

    def test_vendor_sees_only_own_payments(self):
        resp = self.v1_client.get('/api/payments/')
        ids = [p['activity'] for p in resp.data]
        self.assertIn(self.act1.id, ids)
        self.assertNotIn(self.act2.id, ids)

    def test_vendor_sees_only_own_occurrences(self):
        resp = self.v1_client.get('/api/occurrences/')
        act_ids = [o['activity'] for o in resp.data]
        self.assertIn(self.act1.id, act_ids)
        self.assertNotIn(self.act2.id, act_ids)

    def test_vendor_sees_only_own_vendors(self):
        resp = self.v1_client.get('/api/vendors/')
        ids = [v['id'] for v in resp.data]
        self.assertIn(self.vendor1.id, ids)
        self.assertNotIn(self.vendor2.id, ids)

    def test_employee_sees_own_vendor_activities(self):
        resp = self.e1_client.get('/api/activities/')
        titles = [a['title'] for a in resp.data]
        self.assertIn('V1 Act', titles)
        self.assertNotIn('V2 Act', titles)

    def test_employee_sees_own_vendor_occurrences(self):
        resp = self.e1_client.get('/api/occurrences/')
        act_ids = [o['activity'] for o in resp.data]
        self.assertIn(self.act1.id, act_ids)
        self.assertNotIn(self.act2.id, act_ids)

    def test_admin_with_branch_sees_only_branch_data(self):
        admin = _admin(self.branch1)
        client = APIClient()
        _login(client, 'admin_gap', 'adminpass')
        resp = client.get('/api/activities/')
        titles = [a['title'] for a in resp.data]
        self.assertIn('V1 Act', titles)
        self.assertNotIn('V2 Act', titles)


# ===========================================================================
# 21. DASHBOARD EDGE CASES
# ===========================================================================

class DashboardEdgeCaseTest(TestCase):
    """Dashboard with empty database, overdue calculations."""

    def setUp(self):
        self.branch = Branch.objects.create(name='B', city='C')
        self.admin = _admin(self.branch)
        self.client = APIClient()
        _login(self.client, 'admin_gap', 'adminpass')

    def test_stats_empty_database(self):
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['total_vendors'], 0)
        self.assertEqual(resp.data['total_activities'], 0)
        self.assertEqual(resp.data['total_employees'], 0)
        self.assertEqual(resp.data['pending_payments_amount'], 0)
        self.assertEqual(resp.data['completed_payments_amount'], 0)
        self.assertEqual(resp.data['overdue_activities_count'], 0)

    def test_stats_overdue_count(self):
        vu, vendor = _vendor_with_user(self.branch)
        Activity.objects.create(
            branch=self.branch, vendor=vendor, title='Overdue',
            activity_type='one_time', start_date=date.today() - timedelta(days=10),
            end_date=date.today() - timedelta(days=1), status='pending',
        )
        Activity.objects.create(
            branch=self.branch, vendor=vendor, title='Not overdue',
            activity_type='one_time', start_date=date.today(),
            end_date=date.today() + timedelta(days=5), status='pending',
        )
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.data['overdue_activities_count'], 1)

    def test_stats_activities_by_status(self):
        vu, vendor = _vendor_with_user(self.branch)
        Activity.objects.create(
            branch=self.branch, vendor=vendor, title='P',
            activity_type='one_time', start_date=date.today(), status='pending',
        )
        Activity.objects.create(
            branch=self.branch, vendor=vendor, title='C',
            activity_type='one_time', start_date=date.today(), status='completed',
        )
        Activity.objects.create(
            branch=self.branch, vendor=vendor, title='C2',
            activity_type='one_time', start_date=date.today(), status='completed',
        )
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.data['activities_by_status']['pending'], 1)
        self.assertEqual(resp.data['activities_by_status']['completed'], 2)

    def test_spending_trends_with_payments(self):
        vu, vendor = _vendor_with_user(self.branch)
        act = Activity.objects.create(
            branch=self.branch, vendor=vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
        )
        Payment.objects.create(
            activity=act, expected_amount=Decimal('5000'),
            actual_amount_paid=Decimal('5000'),
            payment_status='completed', payment_date=date.today(),
        )
        resp = self.client.get('/api/dashboard/spending-trends/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Current month should have some data
        current_month = date.today().strftime('%b %Y')
        months = {e['month']: e['amount'] for e in resp.data}
        if current_month in months:
            self.assertEqual(months[current_month], 5000.0)

    def test_completion_rates_with_data(self):
        vu, vendor = _vendor_with_user(self.branch)
        act = Activity.objects.create(
            branch=self.branch, vendor=vendor, title='Act',
            activity_type='one_time', start_date=date.today(),
        )
        ActivityOccurrence.objects.create(
            activity=act, scheduled_date=date.today(), status='completed',
        )
        ActivityOccurrence.objects.create(
            activity=act, scheduled_date=date.today(), status='pending',
        )
        resp = self.client.get('/api/dashboard/completion-rates/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        current_month = date.today().strftime('%b %Y')
        months = {e['month']: e['rate'] for e in resp.data}
        if current_month in months:
            self.assertEqual(months[current_month], 50.0)


# ===========================================================================
# 22. UNAUTHENTICATED WRITE ATTEMPTS
# ===========================================================================

class UnauthenticatedWriteTest(TestCase):
    """Unauthenticated users cannot write to any endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='B', city='C')

    def test_cannot_create_branch(self):
        resp = self.client.post('/api/branches/', {'name': 'X', 'city': 'Y'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_create_vendor(self):
        resp = self.client.post('/api/vendors/', {'branch': self.branch.id})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_create_activity(self):
        resp = self.client.post('/api/activities/', {'title': 'X'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_create_payment(self):
        resp = self.client.post('/api/payments/', {'expected_amount': 100})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_create_work_log(self):
        resp = self.client.post('/api/work-logs/', {'description': 'X'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_access_dashboard(self):
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
