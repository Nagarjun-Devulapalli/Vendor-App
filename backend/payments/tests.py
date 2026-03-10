from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Payment
from activities.models import Activity
from vendors.models import Branch, Vendor

User = get_user_model()


class PaymentModelTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='test123', role='vendor_owner',
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Test Activity', activity_type='one_time',
            start_date=date.today(), expected_cost=10000,
        )

    def test_create_payment(self):
        payment = Payment.objects.create(
            activity=self.activity,
            expected_amount=10000,
            actual_amount_paid=5000,
            payment_status='partial',
        )
        self.assertEqual(payment.payment_status, 'partial')
        self.assertEqual(payment.expected_amount, 10000)
        self.assertEqual(payment.actual_amount_paid, 5000)

    def test_default_payment_status(self):
        payment = Payment.objects.create(
            activity=self.activity,
            expected_amount=10000,
        )
        self.assertEqual(payment.payment_status, 'pending')
        self.assertEqual(payment.actual_amount_paid, 0)


class PaymentAPITest(TestCase):
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
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, branch=self.branch,
        )
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Test Activity', activity_type='one_time',
            start_date=date.today(), expected_cost=10000,
        )

    def test_create_payment_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/payments/', {
            'activity': self.activity.id,
            'expected_amount': '10000.00',
            'actual_amount_paid': '10000.00',
            'payment_status': 'completed',
            'payment_date': str(date.today()),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)

    def test_create_payment_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post('/api/payments/', {
            'activity': self.activity.id,
            'expected_amount': '10000.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_payments_admin(self):
        self.client.force_authenticate(user=self.admin)
        Payment.objects.create(
            activity=self.activity, expected_amount=10000,
            payment_status='pending',
        )
        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_update_payment_admin(self):
        self.client.force_authenticate(user=self.admin)
        payment = Payment.objects.create(
            activity=self.activity, expected_amount=10000,
            payment_status='pending',
        )
        response = self.client.patch(f'/api/payments/{payment.id}/', {
            'actual_amount_paid': '7500.00',
            'payment_status': 'partial',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, 'partial')
        self.assertEqual(float(payment.actual_amount_paid), 7500.0)

    def test_complete_payment_flow(self):
        """Test full payment lifecycle: pending -> partial -> completed"""
        self.client.force_authenticate(user=self.admin)
        # Create pending payment
        response = self.client.post('/api/payments/', {
            'activity': self.activity.id,
            'expected_amount': '10000.00',
            'payment_status': 'pending',
        }, format='json')
        payment_id = response.data['id']

        # Mark partial
        response = self.client.patch(f'/api/payments/{payment_id}/', {
            'actual_amount_paid': '5000.00',
            'payment_status': 'partial',
        }, format='json')
        self.assertEqual(response.data['payment_status'], 'partial')

        # Mark completed
        response = self.client.patch(f'/api/payments/{payment_id}/', {
            'actual_amount_paid': '10000.00',
            'payment_status': 'completed',
            'payment_date': str(date.today()),
        }, format='json')
        self.assertEqual(response.data['payment_status'], 'completed')

    def test_filter_payments_by_status(self):
        self.client.force_authenticate(user=self.admin)
        Payment.objects.create(
            activity=self.activity, expected_amount=10000, payment_status='pending',
        )
        Payment.objects.create(
            activity=self.activity, expected_amount=5000, payment_status='completed',
        )
        response = self.client.get('/api/payments/?payment_status=pending')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for p in response.data:
            self.assertEqual(p['payment_status'], 'pending')

    def test_payment_serializer_fields(self):
        self.client.force_authenticate(user=self.admin)
        Payment.objects.create(
            activity=self.activity, expected_amount=10000, payment_status='pending',
        )
        response = self.client.get('/api/payments/')
        self.assertIn('activity_title', response.data[0])
        self.assertIn('vendor_name', response.data[0])
