"""
End-to-end tests that simulate complete user workflows spanning multiple
apps/endpoints, verifying the system works as a whole.
"""
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

def _create_admin(branch=None):
    """Create an admin user with optional branch."""
    return User.objects.create_user(
        username='admin_e2e', password='adminpass123',
        first_name='Admin', last_name='User',
        role='admin', branch=branch,
    )


def _login(client, username, password):
    """Login via the auth endpoint and return the access token."""
    resp = client.post('/api/auth/login/', {'username': username, 'password': password})
    if resp.status_code == 200:
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return resp


def _dummy_image(name='test.png'):
    """Return a minimal valid PNG file for photo uploads."""
    # 1x1 red pixel PNG
    import struct, zlib
    raw = b'\x00\xff\x00\x00'
    scanline = b'\x00' + raw[:3]
    deflated = zlib.compress(scanline)
    png = b'\x89PNG\r\n\x1a\n'
    def chunk(ctype, data):
        c = ctype + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack('>I', len(data)) + c + crc
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', deflated)
    png += chunk(b'IEND', b'')
    return SimpleUploadedFile(name, png, content_type='image/png')


# ===========================================================================
# 1. Onboarding Flow
# ===========================================================================

class E2EOnboardingFlowTest(TestCase):
    """Admin onboards vendors & employees – full registration flow."""

    def setUp(self):
        self.client = APIClient()

    def test_full_onboarding(self):
        # --- Step 1: Admin creates foundational objects ---
        branch = Branch.objects.create(name='Downtown', city='Metro City')
        admin = _create_admin(branch=branch)
        login_resp = _login(self.client, 'admin_e2e', 'adminpass123')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)
        self.assertEqual(login_resp.data['user']['role'], 'admin')

        # Admin creates a work category
        cat_resp = self.client.post('/api/categories/', {'name': 'Plumbing', 'description': 'Pipe work'})
        self.assertEqual(cat_resp.status_code, status.HTTP_201_CREATED)
        category_id = cat_resp.data['id']

        # Admin creates a second branch via API
        branch_resp = self.client.post('/api/branches/', {'name': 'Uptown', 'city': 'Metro City'})
        self.assertEqual(branch_resp.status_code, status.HTTP_201_CREATED)

        # --- Step 2: Admin registers a vendor ---
        vendor_resp = self.client.post('/api/vendors/', {
            'branch': branch.id,
            'first_name': 'Raj',
            'last_name': 'Kumar',
            'phone': '9876543210',
            'company_name': 'Raj Plumbing',
            'category_ids': [category_id],
        }, format='json')
        self.assertEqual(vendor_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('credentials', vendor_resp.data)
        vendor_username = vendor_resp.data['credentials']['username']
        vendor_password = vendor_resp.data['credentials']['password']
        vendor_id = vendor_resp.data['id']

        # --- Step 3: Vendor logs in with auto-generated credentials ---
        vendor_client = APIClient()
        vendor_login = _login(vendor_client, vendor_username, vendor_password)
        self.assertEqual(vendor_login.status_code, status.HTTP_200_OK)
        self.assertEqual(vendor_login.data['user']['role'], 'vendor_owner')

        # --- Step 4: Vendor registers an employee ---
        emp_resp = vendor_client.post('/api/employees/', {
            'vendor_owner': vendor_id,
            'first_name': 'Sita',
            'last_name': 'Devi',
            'phone': '9876543211',
        })
        self.assertEqual(emp_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('credentials', emp_resp.data)
        emp_username = emp_resp.data['credentials']['username']
        emp_password = emp_resp.data['credentials']['password']

        # --- Step 5: Employee logs in ---
        emp_client = APIClient()
        emp_login = _login(emp_client, emp_username, emp_password)
        self.assertEqual(emp_login.status_code, status.HTTP_200_OK)
        self.assertEqual(emp_login.data['user']['role'], 'vendor_employee')

        # --- Step 6: Each user fetches their profile ---
        # Admin profile
        profile = self.client.get('/api/auth/profile/')
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data['role'], 'admin')

        # Vendor profile
        v_profile = vendor_client.get('/api/auth/profile/')
        self.assertEqual(v_profile.status_code, status.HTTP_200_OK)
        self.assertEqual(v_profile.data['role'], 'vendor_owner')
        self.assertEqual(v_profile.data['branch'], branch.id)

        # Employee profile
        e_profile = emp_client.get('/api/auth/profile/')
        self.assertEqual(e_profile.status_code, status.HTTP_200_OK)
        self.assertEqual(e_profile.data['role'], 'vendor_employee')
        self.assertEqual(e_profile.data['branch'], branch.id)


# ===========================================================================
# 2. Activity Workflow
# ===========================================================================

class E2EActivityWorkflowTest(TestCase):
    """Full activity lifecycle: create → occurrence → work log → review."""

    def setUp(self):
        self.admin_client = APIClient()
        self.vendor_client = APIClient()

        self.branch = Branch.objects.create(name='Main', city='City')
        self.admin = _create_admin(branch=self.branch)
        self.category = WorkCategory.objects.create(name='Cleaning')

        # Create vendor directly (we tested the registration flow above)
        self.vendor_user = User.objects.create_user(
            username='vendor_act', password='vendorpass',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)

        _login(self.admin_client, 'admin_e2e', 'adminpass123')
        _login(self.vendor_client, 'vendor_act', 'vendorpass')

    def test_activity_full_lifecycle(self):
        today = date.today()

        # --- Admin creates a one-time activity ---
        act_resp = self.admin_client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'category': self.category.id,
            'title': 'Office Deep Clean',
            'activity_type': 'one_time',
            'start_date': str(today),
            'expected_cost': '5000.00',
            'payment_type': 'contract',
        })
        self.assertEqual(act_resp.status_code, status.HTTP_201_CREATED)
        activity_id = act_resp.data['id']

        # --- Verify occurrence auto-generated ---
        occ_resp = self.admin_client.get(f'/api/activities/{activity_id}/occurrences/')
        self.assertEqual(occ_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(occ_resp.data), 1)
        occurrence_id = occ_resp.data[0]['id']
        self.assertEqual(occ_resp.data[0]['status'], 'pending')

        # --- Vendor views today's occurrences ---
        today_resp = self.vendor_client.get('/api/occurrences/today/')
        self.assertEqual(today_resp.status_code, status.HTTP_200_OK)
        occurrence_ids = [o['id'] for o in today_resp.data]
        self.assertIn(occurrence_id, occurrence_ids)

        # --- Vendor submits a work log ---
        before_photo = _dummy_image('before.png')
        wl_resp = self.vendor_client.post(
            '/api/work-logs/',
            {'occurrence': occurrence_id, 'description': 'Starting clean', 'before_photo': before_photo},
            format='multipart',
        )
        self.assertEqual(wl_resp.status_code, status.HTTP_201_CREATED)
        work_log_id = wl_resp.data['id']
        self.assertEqual(wl_resp.data['status'], 'in_progress')

        # Occurrence should now be in_progress
        occ_detail = self.vendor_client.get(f'/api/occurrences/{occurrence_id}/')
        self.assertEqual(occ_detail.data['status'], 'in_progress')

        # --- Vendor completes the work log ---
        after_photo = _dummy_image('after.png')
        complete_resp = self.vendor_client.patch(
            f'/api/work-logs/{work_log_id}/complete/',
            {'after_photo': after_photo},
            format='multipart',
        )
        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_resp.data['status'], 'completed')

        # Occurrence should now be completed
        occ_detail = self.vendor_client.get(f'/api/occurrences/{occurrence_id}/')
        self.assertEqual(occ_detail.data['status'], 'completed')

        # --- Admin reviews (approves) the work log ---
        review_resp = self.admin_client.patch(
            f'/api/work-logs/{work_log_id}/review/',
            {'approval_status': 'approved'},
            format='json',
        )
        self.assertEqual(review_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(review_resp.data['approval_status'], 'approved')
        self.assertIsNotNone(review_resp.data['reviewed_at'])


# ===========================================================================
# 3. Recurring Activity Occurrence Generation
# ===========================================================================

class E2ERecurringActivityTest(TestCase):
    """Recurring and long-term activity occurrence generation."""

    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='Branch R', city='City')
        self.admin = _create_admin(branch=self.branch)
        self.category = WorkCategory.objects.create(name='Gardening')
        self.vendor_user = User.objects.create_user(
            username='vendor_rec', password='vendorpass',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)
        _login(self.client, 'admin_e2e', 'adminpass123')

    def test_recurring_activity_occurrences(self):
        today = date.today()
        end = today + timedelta(days=30)

        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'category': self.category.id,
            'title': 'Weekly Garden Maintenance',
            'activity_type': 'recurring',
            'start_date': str(today),
            'end_date': str(end),
            'recurrence_interval_days': 7,
            'expected_cost': '2000.00',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        activity_id = resp.data['id']

        occ_resp = self.client.get(f'/api/activities/{activity_id}/occurrences/')
        self.assertEqual(occ_resp.status_code, status.HTTP_200_OK)

        # Calculate expected: every 7 days from today to today+30 days
        expected_count = 0
        current = today
        while current <= end:
            expected_count += 1
            current += timedelta(days=7)
        self.assertEqual(len(occ_resp.data), expected_count)

    def test_long_term_daily_occurrences(self):
        today = date.today()
        end = today + timedelta(days=4)  # 5 days total

        resp = self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'title': 'Daily Office Cleaning',
            'activity_type': 'long_term',
            'start_date': str(today),
            'end_date': str(end),
            'expected_cost': '500.00',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        activity_id = resp.data['id']

        occ_resp = self.client.get(f'/api/activities/{activity_id}/occurrences/')
        self.assertEqual(occ_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(occ_resp.data), 5)  # 5 daily occurrences


# ===========================================================================
# 4. Payment Lifecycle
# ===========================================================================

class E2EPaymentLifecycleTest(TestCase):
    """Full payment flow: create → partial → completed, with filtering."""

    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='Pay Branch', city='City')
        self.admin = _create_admin(branch=self.branch)
        self.category = WorkCategory.objects.create(name='Electrical')
        self.vendor_user = User.objects.create_user(
            username='vendor_pay', password='vendorpass',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)
        _login(self.client, 'admin_e2e', 'adminpass123')

        # Create an activity for the payment
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, category=self.category,
            title='Rewiring Office', activity_type='one_time',
            start_date=date.today(), expected_cost=Decimal('15000.00'),
        )

    def test_payment_full_lifecycle(self):
        # --- Create payment (expected_amount auto-fills from activity) ---
        pay_resp = self.client.post('/api/payments/', {
            'activity': self.activity.id,
            'expected_amount': 0,  # Should auto-fill to 15000
        })
        self.assertEqual(pay_resp.status_code, status.HTTP_201_CREATED)
        payment_id = pay_resp.data['id']
        self.assertEqual(Decimal(str(pay_resp.data['expected_amount'])), Decimal('15000.00'))
        self.assertEqual(pay_resp.data['payment_status'], 'pending')

        # --- Update to partial payment ---
        partial_resp = self.client.patch(f'/api/payments/{payment_id}/', {
            'payment_status': 'partial',
            'actual_amount_paid': '7500.00',
        }, format='json')
        self.assertEqual(partial_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(partial_resp.data['payment_status'], 'partial')

        # --- Update to completed payment with date ---
        today_str = str(date.today())
        complete_resp = self.client.patch(f'/api/payments/{payment_id}/', {
            'payment_status': 'completed',
            'actual_amount_paid': '15000.00',
            'payment_date': today_str,
        }, format='json')
        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_resp.data['payment_status'], 'completed')
        self.assertEqual(complete_resp.data['payment_date'], today_str)

    def test_payment_filter_by_status(self):
        Payment.objects.create(activity=self.activity, expected_amount=1000, payment_status='pending')
        Payment.objects.create(activity=self.activity, expected_amount=2000, payment_status='completed',
                               actual_amount_paid=2000, payment_date=date.today())

        pending = self.client.get('/api/payments/?payment_status=pending')
        self.assertEqual(pending.status_code, status.HTTP_200_OK)
        self.assertTrue(all(p['payment_status'] == 'pending' for p in pending.data))

        completed = self.client.get('/api/payments/?payment_status=completed')
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertTrue(all(p['payment_status'] == 'completed' for p in completed.data))


# ===========================================================================
# 5. Role-Based Access Control
# ===========================================================================

class E2ERoleBasedAccessTest(TestCase):
    """Permission enforcement across roles."""

    def setUp(self):
        self.branch = Branch.objects.create(name='RBAC Branch', city='City')
        self.admin = _create_admin(branch=self.branch)
        self.category = WorkCategory.objects.create(name='Painting')

        self.vendor_user = User.objects.create_user(
            username='vendor_rbac', password='vendorpass',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)

        self.emp_user = User.objects.create_user(
            username='emp_rbac', password='emppass',
            role='vendor_employee', branch=self.branch,
        )
        Employee.objects.create(user=self.emp_user, vendor_owner=self.vendor)

        # Clients
        self.admin_client = APIClient()
        self.vendor_client = APIClient()
        self.emp_client = APIClient()
        self.anon_client = APIClient()

        _login(self.admin_client, 'admin_e2e', 'adminpass123')
        _login(self.vendor_client, 'vendor_rbac', 'vendorpass')
        _login(self.emp_client, 'emp_rbac', 'emppass')

    def test_vendor_cannot_create_activities(self):
        resp = self.vendor_client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'Hack',
            'activity_type': 'one_time', 'start_date': str(date.today()),
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_cannot_create_payments(self):
        activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Task',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('1000'),
        )
        resp = self.vendor_client.post('/api/payments/', {
            'activity': activity.id, 'expected_amount': '1000',
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_create_activities(self):
        resp = self.emp_client.post('/api/activities/', {
            'vendor': self.vendor.id, 'title': 'Hack',
            'activity_type': 'one_time', 'start_date': str(date.today()),
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_access_denied(self):
        endpoints = [
            '/api/activities/', '/api/payments/', '/api/vendors/',
            '/api/employees/', '/api/categories/', '/api/occurrences/',
            '/api/work-logs/', '/api/auth/profile/',
        ]
        for url in endpoints:
            resp = self.anon_client.get(url)
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED,
                             f"Expected 401 for GET {url}, got {resp.status_code}")

    def test_vendor_sees_only_own_activities(self):
        # Create a second vendor with its own activity
        other_user = User.objects.create_user(
            username='vendor_other', password='pass',
            role='vendor_owner', branch=self.branch,
        )
        other_vendor = Vendor.objects.create(user=other_user, branch=self.branch)

        Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='My Activity',
            activity_type='one_time', start_date=date.today(),
        )
        Activity.objects.create(
            branch=self.branch, vendor=other_vendor, title='Other Activity',
            activity_type='one_time', start_date=date.today(),
        )

        resp = self.vendor_client.get('/api/activities/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [a['title'] for a in resp.data]
        self.assertIn('My Activity', titles)
        self.assertNotIn('Other Activity', titles)

    def test_dashboard_forbidden_for_non_admins(self):
        endpoints = [
            '/api/dashboard/stats/',
            '/api/dashboard/spending-trends/',
            '/api/dashboard/completion-rates/',
        ]
        for url in endpoints:
            resp = self.vendor_client.get(url)
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN,
                             f"Expected 403 for vendor GET {url}")
            resp = self.emp_client.get(url)
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN,
                             f"Expected 403 for employee GET {url}")


# ===========================================================================
# 6. Dashboard with Real Data
# ===========================================================================

class E2EDashboardWithDataTest(TestCase):
    """Dashboard endpoints reflect real data."""

    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='Dash Branch', city='City')
        self.admin = _create_admin(branch=self.branch)
        _login(self.client, 'admin_e2e', 'adminpass123')

        self.category = WorkCategory.objects.create(name='Security')
        self.vendor_user = User.objects.create_user(
            username='vendor_dash', password='vendorpass',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)

    def test_dashboard_stats_reflect_data(self):
        # Create activities
        a1 = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='Guard Duty',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('10000'), status='pending',
        )
        a2 = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, title='CCTV Install',
            activity_type='one_time', start_date=date.today(),
            expected_cost=Decimal('20000'), status='completed',
        )

        # Create payments
        Payment.objects.create(
            activity=a1, expected_amount=Decimal('10000'),
            payment_status='pending',
        )
        Payment.objects.create(
            activity=a2, expected_amount=Decimal('20000'),
            actual_amount_paid=Decimal('20000'),
            payment_status='completed', payment_date=date.today(),
        )

        # Create an employee
        emp_user = User.objects.create_user(
            username='emp_dash', password='emppass',
            role='vendor_employee', branch=self.branch,
        )
        Employee.objects.create(user=emp_user, vendor_owner=self.vendor)

        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['total_vendors'], 1)
        self.assertEqual(resp.data['total_activities'], 2)
        self.assertEqual(resp.data['total_employees'], 1)
        self.assertEqual(resp.data['pending_payments_amount'], 10000.0)
        self.assertEqual(resp.data['completed_payments_amount'], 20000.0)

    def test_spending_trends_returns_data(self):
        resp = self.client.get('/api/dashboard/spending-trends/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)
        self.assertEqual(len(resp.data), 6)  # Last 6 months
        for entry in resp.data:
            self.assertIn('month', entry)
            self.assertIn('amount', entry)

    def test_completion_rates_returns_data(self):
        resp = self.client.get('/api/dashboard/completion-rates/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)
        self.assertEqual(len(resp.data), 6)
        for entry in resp.data:
            self.assertIn('month', entry)
            self.assertIn('rate', entry)


# ===========================================================================
# 7. Work Log Review Flow (rejection & resubmission)
# ===========================================================================

class E2EWorkLogReviewFlowTest(TestCase):
    """Work log rejection and resubmission."""

    def setUp(self):
        self.admin_client = APIClient()
        self.vendor_client = APIClient()

        self.branch = Branch.objects.create(name='Review Branch', city='City')
        self.admin = _create_admin(branch=self.branch)
        self.vendor_user = User.objects.create_user(
            username='vendor_review', password='vendorpass',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)

        _login(self.admin_client, 'admin_e2e', 'adminpass123')
        _login(self.vendor_client, 'vendor_review', 'vendorpass')

        # Create an activity with an occurrence for today
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Floor Polish', activity_type='one_time',
            start_date=date.today(), expected_cost=Decimal('3000'),
        )
        self.occurrence = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )

    def test_reject_and_resubmit(self):
        # --- Vendor submits first work log ---
        before1 = _dummy_image('before1.png')
        wl1_resp = self.vendor_client.post(
            '/api/work-logs/',
            {'occurrence': self.occurrence.id, 'description': 'First attempt', 'before_photo': before1},
            format='multipart',
        )
        self.assertEqual(wl1_resp.status_code, status.HTTP_201_CREATED)
        wl1_id = wl1_resp.data['id']

        # Vendor completes it
        after1 = _dummy_image('after1.png')
        self.vendor_client.patch(
            f'/api/work-logs/{wl1_id}/complete/',
            {'after_photo': after1},
            format='multipart',
        )

        # --- Admin rejects with reason ---
        reject_resp = self.admin_client.patch(
            f'/api/work-logs/{wl1_id}/review/',
            {'approval_status': 'rejected', 'rejection_reason': 'Incomplete polishing in corners'},
            format='json',
        )
        self.assertEqual(reject_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_resp.data['approval_status'], 'rejected')
        self.assertEqual(reject_resp.data['rejection_reason'], 'Incomplete polishing in corners')
        self.assertIsNotNone(reject_resp.data['reviewed_at'])

        # --- Vendor submits new work log ---
        before2 = _dummy_image('before2.png')
        wl2_resp = self.vendor_client.post(
            '/api/work-logs/',
            {'occurrence': self.occurrence.id, 'description': 'Second attempt – corners done', 'before_photo': before2},
            format='multipart',
        )
        self.assertEqual(wl2_resp.status_code, status.HTTP_201_CREATED)
        wl2_id = wl2_resp.data['id']

        # Vendor completes it
        after2 = _dummy_image('after2.png')
        self.vendor_client.patch(
            f'/api/work-logs/{wl2_id}/complete/',
            {'after_photo': after2},
            format='multipart',
        )

        # --- Admin approves ---
        approve_resp = self.admin_client.patch(
            f'/api/work-logs/{wl2_id}/review/',
            {'approval_status': 'approved'},
            format='json',
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_resp.data['approval_status'], 'approved')

        # Verify both work logs exist for the occurrence
        wl_list = self.vendor_client.get(f'/api/work-logs/?occurrence={self.occurrence.id}')
        self.assertEqual(wl_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(wl_list.data), 2)

    def test_vendor_cannot_review_work_logs(self):
        """Vendors should not be able to review work logs."""
        before = _dummy_image('before.png')
        wl_resp = self.vendor_client.post(
            '/api/work-logs/',
            {'occurrence': self.occurrence.id, 'description': 'Test', 'before_photo': before},
            format='multipart',
        )
        wl_id = wl_resp.data['id']

        review_resp = self.vendor_client.patch(
            f'/api/work-logs/{wl_id}/review/',
            {'approval_status': 'approved'},
            format='json',
        )
        self.assertEqual(review_resp.status_code, status.HTTP_403_FORBIDDEN)
