from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Activity, ActivityOccurrence, WorkLog
from vendors.models import Branch, Vendor
from categories.models import WorkCategory

User = get_user_model()


class ActivityModelTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='test123', role='vendor_owner',
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)
        self.cat = WorkCategory.objects.create(name='Electrical')

    def test_create_activity(self):
        activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor, category=self.cat,
            title='Panel Check', activity_type='one_time',
            start_date=date.today(), expected_cost=5000, payment_type='contract',
        )
        self.assertEqual(activity.status, 'pending')
        self.assertEqual(activity.title, 'Panel Check')

    def test_is_overdue_property(self):
        past_activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Overdue Task', activity_type='one_time',
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() - timedelta(days=5),
            status='pending',
        )
        self.assertTrue(past_activity.is_overdue)

    def test_is_not_overdue_when_completed(self):
        activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Done Task', activity_type='one_time',
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() - timedelta(days=5),
            status='completed',
        )
        self.assertFalse(activity.is_overdue)


class OccurrenceModelTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='test123', role='vendor_owner',
        )
        self.vendor = Vendor.objects.create(user=self.vendor_user, branch=self.branch)
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Test', activity_type='one_time',
            start_date=date.today(),
        )

    def test_create_occurrence(self):
        occ = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )
        self.assertEqual(occ.status, 'pending')
        self.assertIsNone(occ.completed_by)


class ActivityAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.cat = WorkCategory.objects.create(name='Electrical')
        self.admin = User.objects.create_user(
            username='admin1', password='admin123',
            role='admin', branch=self.branch,
        )
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='vendor123',
            role='vendor_owner', branch=self.branch,
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, branch=self.branch, company_name='Test Co',
        )

    def test_create_one_time_activity(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'category': self.cat.id,
            'title': 'Panel Check',
            'activity_type': 'one_time',
            'start_date': str(date.today()),
            'expected_cost': '5000.00',
            'payment_type': 'contract',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Activity.objects.count(), 1)
        # Should auto-generate 1 occurrence
        activity = Activity.objects.first()
        self.assertEqual(activity.occurrences.count(), 1)

    def test_create_recurring_activity_generates_occurrences(self):
        self.client.force_authenticate(user=self.admin)
        start = date.today()
        end = start + timedelta(days=30)
        response = self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'category': self.cat.id,
            'title': 'Recurring Task',
            'activity_type': 'recurring',
            'start_date': str(start),
            'end_date': str(end),
            'recurrence_interval_days': 7,
            'expected_cost': '1000.00',
            'payment_type': 'daily',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        activity = Activity.objects.first()
        # Should generate occurrences every 7 days: day 0, 7, 14, 21, 28 = 5
        expected_count = len(range(0, 31, 7))
        self.assertEqual(activity.occurrences.count(), expected_count)

    def test_create_long_term_activity(self):
        self.client.force_authenticate(user=self.admin)
        start = date.today()
        end = start + timedelta(days=5)
        response = self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'title': 'Multi-day Task',
            'activity_type': 'long_term',
            'start_date': str(start),
            'end_date': str(end),
            'expected_cost': '3000.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        activity = Activity.objects.first()
        # Should generate 1 occurrence per day (6 days: day 0 to day 5)
        self.assertEqual(activity.occurrences.count(), 6)

    def test_list_activities_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/activities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_activity_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'title': 'Should Fail',
            'activity_type': 'one_time',
            'start_date': str(date.today()),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activity_occurrences_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post('/api/activities/', {
            'vendor': self.vendor.id,
            'title': 'Panel Check',
            'activity_type': 'one_time',
            'start_date': str(date.today()),
            'expected_cost': '5000.00',
        }, format='json')
        activity = Activity.objects.first()
        response = self.client.get(f'/api/activities/{activity.id}/occurrences/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class OccurrenceAPITest(TestCase):
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
            title='Test Task', activity_type='one_time',
            start_date=date.today(),
        )
        self.occ = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )

    def test_today_occurrences(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get('/api/occurrences/today/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_update_occurrence_status(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.patch(f'/api/occurrences/{self.occ.id}/', {
            'status': 'completed',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.occ.refresh_from_db()
        self.assertEqual(self.occ.status, 'completed')
        self.assertIsNotNone(self.occ.completed_by)

    def test_mark_as_missed(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.patch(f'/api/occurrences/{self.occ.id}/', {
            'status': 'missed',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.occ.refresh_from_db()
        self.assertEqual(self.occ.status, 'missed')

    def test_list_occurrences(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.get('/api/occurrences/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class WorkLogAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.branch = Branch.objects.create(name='HSR Layout', city='Bangalore')
        self.vendor_user = User.objects.create_user(
            username='vendor1', password='vendor123',
            role='vendor_owner', branch=self.branch,
            first_name='Vendor', last_name='One',
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, branch=self.branch,
        )
        self.activity = Activity.objects.create(
            branch=self.branch, vendor=self.vendor,
            title='Test', activity_type='one_time',
            start_date=date.today(),
        )
        self.occ = ActivityOccurrence.objects.create(
            activity=self.activity, scheduled_date=date.today(),
        )

    def test_submit_work_log(self):
        self.client.force_authenticate(user=self.vendor_user)
        response = self.client.post('/api/work-logs/', {
            'occurrence': self.occ.id,
            'description': 'Checked all panels. No issues found.',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkLog.objects.count(), 1)
        log = WorkLog.objects.first()
        self.assertEqual(log.user, self.vendor_user)
        self.assertEqual(log.description, 'Checked all panels. No issues found.')

    def test_list_work_logs_for_occurrence(self):
        self.client.force_authenticate(user=self.vendor_user)
        WorkLog.objects.create(
            occurrence=self.occ, user=self.vendor_user,
            description='Test log',
        )
        response = self.client.get(f'/api/work-logs/?occurrence={self.occ.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_work_log_unauthenticated(self):
        response = self.client.post('/api/work-logs/', {
            'occurrence': self.occ.id,
            'description': 'Should fail',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
