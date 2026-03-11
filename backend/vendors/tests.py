from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Branch, Vendor, Employee
from categories.models import WorkCategory

User = get_user_model()


class BranchModelTest(TestCase):
    def test_create_branch(self):
        branch = Branch.objects.create(name='HSR Layout', city='Bangalore', address='HSR Layout, Sector 7')
        self.assertEqual(str(branch), 'HSR Layout')
        self.assertIsNotNone(branch.created_at)


class VendorModelTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.user = User.objects.create_user(
            username='vendor1', password='test123',
            role='vendor_owner', first_name='Rajesh', last_name='Sharma',
        )

    def test_vendor_with_company_name(self):
        vendor = Vendor.objects.create(user=self.user, branch=self.branch, company_name='Sharma Electricals')
        self.assertEqual(vendor.display_name, 'Sharma Electricals')

    def test_vendor_without_company_name(self):
        vendor = Vendor.objects.create(user=self.user, branch=self.branch, company_name='')
        self.assertEqual(vendor.display_name, 'Rajesh Sharma')

    def test_vendor_display_name_fallback_to_username(self):
        user = User.objects.create_user(username='vendor_no_name', password='test123', role='vendor_owner')
        vendor = Vendor.objects.create(user=user, branch=self.branch)
        self.assertEqual(vendor.display_name, 'vendor_no_name')

    def test_vendor_categories(self):
        cat1 = WorkCategory.objects.create(name='Electrical')
        cat2 = WorkCategory.objects.create(name='Plumbing')
        vendor = Vendor.objects.create(user=self.user, branch=self.branch)
        vendor.categories.set([cat1, cat2])
        self.assertEqual(vendor.categories.count(), 2)


class EmployeeModelTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='test123', role='vendor_owner',
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)

    def test_create_employee(self):
        emp_user = User.objects.create_user(
            username='emp1', password='test123',
            role='vendor_employee', first_name='Suresh', last_name='Kumar',
        )
        emp = Employee.objects.create(user=emp_user, vendor_owner=self.vendor)
        self.assertEqual(emp.vendor_owner, self.vendor)


class BranchAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.admin = User.objects.create_user(
            username='admin1', password='admin123',
            role='admin', branch=self.branch,
        )

    def test_list_branches(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/branches/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_branch(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/branches/', {
            'name': 'Whitefield', 'city': 'Bangalore',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Branch.objects.count(), 2)


class VendorAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.cat = WorkCategory.objects.create(name='Electrical')
        self.admin = User.objects.create_user(
            username='admin1', password='admin123',
            role='admin', branch=self.branch,
        )

    def test_register_vendor(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/vendors/', {
            'first_name': 'Rajesh',
            'last_name': 'Sharma',
            'phone': '9876543210',
            'company_name': 'Sharma Electricals',
            'branch': self.branch.id,
            'category_ids': [self.cat.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('generated_password', response.data)
        self.assertEqual(Vendor.objects.count(), 1)
        vendor = Vendor.objects.first()
        self.assertEqual(vendor.company_name, 'Sharma Electricals')
        self.assertEqual(vendor.user.role, 'vendor_owner')

    def test_register_vendor_without_company_name(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/vendors/', {
            'first_name': 'Suresh',
            'last_name': 'Gowda',
            'phone': '9876543211',
            'branch': self.branch.id,
            'category_ids': [self.cat.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        vendor = Vendor.objects.first()
        self.assertEqual(vendor.display_name, 'Suresh Gowda')

    def test_list_vendors_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/vendors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendors_by_category(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post('/api/vendors/', {
            'first_name': 'Raj', 'last_name': 'S', 'phone': '9876543210',
            'branch': self.branch.id, 'category_ids': [self.cat.id],
        }, format='json')
        response = self.client.get(f'/api/vendors/by-category/?cat={self.cat.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_vendor_auto_credentials_login(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/vendors/', {
            'first_name': 'Test', 'last_name': 'Vendor', 'phone': '9876543212',
            'branch': self.branch.id, 'category_ids': [self.cat.id],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        username = response.data['user']['username']
        password = response.data['generated_password']
        self.client.logout()
        login_response = self.client.post('/api/auth/login/', {
            'username': username, 'password': password,
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)


class EmployeeAPITest(TestCase):
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
            first_name='Rajesh', last_name='Sharma',
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, branch=self.branch, company_name='Test Co',
        )

    def test_register_employee_by_owner(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post('/api/employees/', {
            'first_name': 'Pradeep',
            'last_name': 'Kumar',
            'phone': '8765432109',
            'vendor_owner': self.vendor.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('generated_password', response.data)
        self.assertEqual(Employee.objects.count(), 1)
        emp = Employee.objects.first()
        self.assertEqual(emp.user.role, 'vendor_employee')
        self.assertEqual(emp.vendor_owner, self.vendor)

    def test_employee_auto_credentials_login(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post('/api/employees/', {
            'first_name': 'Test', 'last_name': 'Emp', 'phone': '8765432110',
            'vendor_owner': self.vendor.id,
        }, format='json')
        username = response.data['user']['username']
        password = response.data['generated_password']
        self.client.logout()
        login_response = self.client.post('/api/auth/login/', {
            'username': username, 'password': password,
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data['user']['role'], 'vendor_employee')

    def test_list_employees_by_owner(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get('/api/employees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
