from rest_framework import viewsets
from rest_framework.decorators import action
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


class BranchAdminViewSet(viewsets.ModelViewSet):
    serializer_class = None  # will be set below
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import BranchAdminSerializer
        return BranchAdminSerializer

    def get_permissions(self):
        from .permissions import IsSuperAdmin
        return [IsSuperAdmin()]

    def get_queryset(self):
        return User.objects.filter(role='admin').select_related('branch').order_by('branch__name', 'first_name')


class UserCredentialViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        from .serializers import UserCredentialSerializer
        return UserCredentialSerializer

    def get_permissions(self):
        from .permissions import IsSuperAdmin
        return [IsSuperAdmin()]

    def get_queryset(self):
        from .models import UserCredential
        qs = UserCredential.objects.select_related('user', 'user__branch').order_by('-created_at')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        branch = self.request.query_params.get('branch')
        if branch:
            qs = qs.filter(user__branch_id=branch)
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__phone__icontains=search)
            )
        return qs

    @action(detail=True, methods=['patch'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        from .models import UserCredential
        credential = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'new_password is required'}, status=400)
        credential.user.set_password(new_password)
        credential.user.save()
        credential.password_plain = new_password
        credential.save()
        return Response({'message': 'Password reset successfully', 'password_plain': new_password})


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
        # Superadmin can filter by branch via query param
        if request.user.role == 'superadmin':
            branch_id = request.query_params.get('branch')
            if branch_id:
                from vendors.models import Branch
                try:
                    branch = Branch.objects.get(id=branch_id)
                except Branch.DoesNotExist:
                    branch = None
            else:
                branch = None  # Show all branches

        vendors_qs = Vendor.objects.filter(branch=branch) if branch else Vendor.objects.all()
        activities_qs = Activity.objects.filter(branch=branch) if branch else Activity.objects.all()
        payments_qs = Payment.objects.filter(activity__branch=branch) if branch else Payment.objects.all()
        employees_qs = Employee.objects.filter(vendor_owner__branch=branch) if branch else Employee.objects.all()

        pending_payments = payments_qs.filter(payment_status='pending').aggregate(total=Sum('expected_amount'))['total'] or 0
        completed_payments = payments_qs.filter(payment_status='completed').aggregate(total=Sum('actual_amount_paid'))['total'] or 0

        overdue_count = sum(1 for a in activities_qs if a.is_overdue)

        status_counts = {}
        for status, count in activities_qs.values_list('status').annotate(count=Count('id')):
            status_counts[status] = count

        return Response({
            'total_vendors': vendors_qs.count(),
            'total_activities': activities_qs.count(),
            'total_employees': employees_qs.count(),
            'pending_payments_amount': float(pending_payments),
            'completed_payments_amount': float(completed_payments),
            'overdue_activities_count': overdue_count,
            'activities_by_status': status_counts,
        })


class SpendingTrendsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from payments.models import Payment

        branch = request.user.branch
        # Superadmin can filter by branch via query param
        if request.user.role == 'superadmin':
            branch_id = request.query_params.get('branch')
            if branch_id:
                from vendors.models import Branch
                try:
                    branch = Branch.objects.get(id=branch_id)
                except Branch.DoesNotExist:
                    branch = None
            else:
                branch = None  # Show all branches
        payments_qs = Payment.objects.filter(activity__branch=branch) if branch else Payment.objects.all()

        today = timezone.now().date()
        result = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
            total = payments_qs.filter(
                payment_date__gte=month_start, payment_date__lt=month_end
            ).aggregate(total=Sum('actual_amount_paid'))['total'] or 0
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
        # Superadmin can filter by branch via query param
        if request.user.role == 'superadmin':
            branch_id = request.query_params.get('branch')
            if branch_id:
                from vendors.models import Branch
                try:
                    branch = Branch.objects.get(id=branch_id)
                except Branch.DoesNotExist:
                    branch = None
            else:
                branch = None  # Show all branches
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
