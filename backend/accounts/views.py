from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from .serializers import LoginSerializer, ResetPasswordSerializer, ProfileSerializer
from .models import User
from .permissions import IsAdmin


class LoginView(APIView):
    permission_classes = [AllowAny]

    def _get_company_name(self, user):
        if user.role == 'vendor_owner' and hasattr(user, 'vendor_profile'):
            return user.vendor_profile.company_name or None
        if user.role == 'vendor_employee' and hasattr(user, 'employee_profile'):
            return user.employee_profile.vendor_owner.company_name or None
        return None

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'branch': user.branch_id,
                'branch_name': user.branch.name if user.branch else None,
                'phone': user.phone,
                'company_name': self._get_company_name(user),
            }
        })


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def put(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(username=serializer.validated_data['username'])
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password updated successfully.'})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from vendors.models import Vendor, Employee
        from activities.models import Activity
        from payments.models import Payment

        branch = request.user.branch
        vendors_qs = Vendor.objects.filter(branch=branch) if branch else Vendor.objects.all()
        activities_qs = Activity.objects.filter(branch=branch) if branch else Activity.objects.all()
        payments_qs = Payment.objects.filter(activity__branch=branch) if branch else Payment.objects.all()
        employees_qs = Employee.objects.filter(vendor_owner__branch=branch) if branch else Employee.objects.all()

        pending_qs = payments_qs.filter(payment_status='pending')
        partial_qs = payments_qs.filter(payment_status='partial')
        completed_qs = payments_qs.filter(payment_status='completed')

        balance_remaining = sum(p.balance_remaining for p in payments_qs.exclude(payment_status='completed'))
        pending_payments_amount = sum(p.total_due for p in pending_qs)
        partial_payments_amount = sum(p.total_paid for p in partial_qs)
        completed_payments_amount = sum(p.total_paid for p in completed_qs)

        overdue_count = sum(1 for a in activities_qs if a.is_overdue)

        status_counts = {}
        for status, count in activities_qs.values_list('status').annotate(count=Count('id')):
            status_counts[status] = count

        return Response({
            'total_vendors': vendors_qs.count(),
            'total_activities': activities_qs.count(),
            'total_employees': employees_qs.count(),
            'balance_remaining_amount': float(balance_remaining),
            'balance_remaining_count': payments_qs.exclude(payment_status='completed').count(),
            'partial_payments_amount': float(partial_payments_amount),
            'partial_payments_count': partial_qs.count(),
            'completed_payments_amount': float(completed_payments_amount),
            'overdue_activities_count': overdue_count,
            'activities_by_status': status_counts,
        })


class SpendingTrendsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from payments.models import PaymentEntry

        branch = request.user.branch
        entries_qs = PaymentEntry.objects.all()
        if branch:
            entries_qs = entries_qs.filter(payment__activity__branch=branch)

        today = timezone.now().date()
        result = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
            total = entries_qs.filter(
                payment_date__gte=month_start, payment_date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            result.append({
                'month': month_start.strftime('%b %Y'),
                'amount': float(total),
            })
        return Response(result)


class CompletionRatesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from activities.models import ActivityOccurrence

        branch = request.user.branch
        occ_qs = ActivityOccurrence.objects.filter(activity__branch=branch) if branch else ActivityOccurrence.objects.all()

        today = timezone.now().date()
        result = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
            total = occ_qs.filter(scheduled_date__gte=month_start, scheduled_date__lt=month_end).count()
            completed = occ_qs.filter(scheduled_date__gte=month_start, scheduled_date__lt=month_end, status='completed').count()
            rate = round((completed / total * 100), 1) if total > 0 else 0
            result.append({
                'month': month_start.strftime('%b %Y'),
                'rate': rate,
            })
        return Response(result)
