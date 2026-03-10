from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from vendors.models import Branch

User = get_user_model()


class UserModelTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.admin = User.objects.create_user(
            username='admin_test', password='testpass123',
            role='admin', branch=self.branch,
            first_name='Test', last_name='Admin', phone='9999999999',
        )

    def test_user_creation(self):
        self.assertEqual(self.admin.role, 'admin')
        self.assertEqual(self.admin.branch, self.branch)
        self.assertEqual(self.admin.phone, '9999999999')

    def test_user_role_choices(self):
        vendor_user = User.objects.create_user(
            username='vendor_test', password='testpass123', role='vendor_owner',
        )
        emp_user = User.objects.create_user(
            username='emp_test', password='testpass123', role='vendor_employee',
        )
        self.assertEqual(vendor_user.role, 'vendor_owner')
        self.assertEqual(emp_user.role, 'vendor_employee')

    def test_user_photo_field_optional(self):
        self.assertFalse(bool(self.admin.photo))


class LoginAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.admin = User.objects.create_user(
            username='admin1', password='admin123',
            role='admin', branch=self.branch,
            first_name='Admin', last_name='One',
        )

    def test_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin1', 'password': 'admin123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'admin1')

    def test_login_wrong_password(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin1', 'password': 'wrongpass',
        }, format='json')
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_login_nonexistent_user(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'nonexistent', 'password': 'testpass',
        }, format='json')
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_login_missing_fields(self):
        response = self.client.post('/api/auth/login/', {}, format='json')
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])


class ProfileAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.admin = User.objects.create_user(
            username='admin1', password='admin123',
            role='admin', branch=self.branch,
            first_name='Admin', last_name='One',
        )

    def test_profile_authenticated(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin1')
        self.assertEqual(response.data['role'], 'admin')
        self.assertEqual(response.data['branch_name'], 'HSR Layout')

    def test_profile_unauthenticated(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DashboardAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.admin = User.objects.create_user(
            username='admin1', password='admin123',
            role='admin', branch=self.branch,
        )
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='vendor123',
            role='vendor_owner', branch=self.branch,
        )

    def test_dashboard_stats_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_stats_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_spending_trends_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/dashboard/spending-trends/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_completion_rates_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/dashboard/completion-rates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
