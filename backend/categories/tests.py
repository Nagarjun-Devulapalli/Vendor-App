from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import WorkCategory
from vendors.models import Branch

User = get_user_model()


class WorkCategoryModelTest(TestCase):
    def test_create_category(self):
        cat = WorkCategory.objects.create(name='Electrical', description='Electrical work')
        self.assertEqual(str(cat), 'Electrical')
        self.assertEqual(cat.description, 'Electrical work')

    def test_category_name_unique(self):
        WorkCategory.objects.create(name='Plumbing')
        with self.assertRaises(Exception):
            WorkCategory.objects.create(name='Plumbing')


class WorkCategoryAPITest(TestCase):
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
        self.cat = WorkCategory.objects.create(name='Cleaning', description='Cleaning services')

    def test_list_categories_authenticated(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_categories_unauthenticated(self):
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_category_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/categories/', {
            'name': 'Security', 'description': 'Security services',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkCategory.objects.count(), 2)

    def test_create_category_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post('/api/categories/', {
            'name': 'Security',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_category_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/categories/{self.cat.id}/', {
            'description': 'Updated description',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cat.refresh_from_db()
        self.assertEqual(self.cat.description, 'Updated description')

    def test_delete_category_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/categories/{self.cat.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(WorkCategory.objects.count(), 0)

    def test_retrieve_category(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/categories/{self.cat.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Cleaning')
