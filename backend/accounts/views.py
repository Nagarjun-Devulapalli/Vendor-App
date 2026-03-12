from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status as drf_status
from django.db.models import Sum, Count, Q
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
        # Allow superadmin to filter by branch via query param
        branch_id = request.query_params.get('branch')
        if request.user.role == 'superadmin' and branch_id:
            from vendors.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                branch = None
        vendors_qs = Vendor.objects.filter(branch=branch) if branch else Vendor.objects.all()
        activities_qs = Activity.objects.filter(branch=branch) if branch else Activity.objects.all()
        payments_qs = Payment.objects.filter(activity__branch=branch) if branch else Payment.objects.all()
        employees_qs = Employee.objects.filter(vendor_owner__branch=branch) if branch else Employee.objects.all()

        # Prefetch related data to avoid N+1 queries
        payments_with_related = payments_qs.select_related(
            'activity'
        ).prefetch_related('entries', 'activity__occurrences')

        pending_list = [p for p in payments_with_related if p.payment_status == 'pending']
        partial_list = [p for p in payments_with_related if p.payment_status == 'partial']
        completed_list = [p for p in payments_with_related if p.payment_status == 'completed']
        unpaid_list = pending_list + partial_list

        balance_remaining = sum(p.balance_remaining for p in unpaid_list)
        partial_payments_amount = sum(p.total_paid for p in partial_list)
        completed_payments_amount = sum(p.total_paid for p in completed_list)

        overdue_count = activities_qs.filter(
            end_date__lt=timezone.now().date()
        ).exclude(status__in=['completed', 'cancelled']).count()

        status_counts = {}
        for status, count in activities_qs.values_list('status').annotate(count=Count('id')):
            status_counts[status] = count

        return Response({
            'total_vendors': vendors_qs.count(),
            'total_activities': activities_qs.count(),
            'total_employees': employees_qs.count(),
            'balance_remaining_amount': float(balance_remaining),
            'balance_remaining_count': len(unpaid_list),
            'partial_payments_amount': float(partial_payments_amount),
            'partial_payments_count': len(partial_list),
            'completed_payments_amount': float(completed_payments_amount),
            'overdue_activities_count': overdue_count,
            'activities_by_status': status_counts,
        })


class SpendingTrendsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from payments.models import PaymentEntry

        branch = request.user.branch
        branch_id = request.query_params.get('branch')
        if request.user.role == 'superadmin' and branch_id:
            from vendors.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                branch = None
        entries_qs = PaymentEntry.objects.all()
        if branch:
            entries_qs = entries_qs.filter(payment__activity__branch=branch)

        today = timezone.now().date()
        # Build month ranges
        months = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
            months.append((month_start, month_end))

        # Single query with conditional aggregation
        from django.db.models import Case, When, DecimalField
        aggregates = {}
        for idx, (ms, me) in enumerate(months):
            aggregates[f'month_{idx}'] = Sum(
                Case(
                    When(payment_date__gte=ms, payment_date__lt=me, then='amount'),
                    default=0, output_field=DecimalField()
                )
            )
        totals = entries_qs.aggregate(**aggregates)

        result = []
        for idx, (ms, me) in enumerate(months):
            result.append({
                'month': ms.strftime('%b %Y'),
                'amount': float(totals[f'month_{idx}'] or 0),
            })
        return Response(result)


class CompletionRatesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from activities.models import ActivityOccurrence

        branch = request.user.branch
        branch_id = request.query_params.get('branch')
        if request.user.role == 'superadmin' and branch_id:
            from vendors.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                branch = None
        occ_qs = ActivityOccurrence.objects.filter(activity__branch=branch) if branch else ActivityOccurrence.objects.all()

        today = timezone.now().date()
        # Build month ranges
        months = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
            months.append((month_start, month_end))

        # Single query with conditional aggregation
        from django.db.models import Case, When, IntegerField, Value
        aggregates = {}
        for idx, (ms, me) in enumerate(months):
            aggregates[f'total_{idx}'] = Count(
                Case(When(scheduled_date__gte=ms, scheduled_date__lt=me, then=Value(1)))
            )
            aggregates[f'completed_{idx}'] = Count(
                Case(When(scheduled_date__gte=ms, scheduled_date__lt=me, status='completed', then=Value(1)))
            )
        totals = occ_qs.aggregate(**aggregates)

        result = []
        for idx, (ms, me) in enumerate(months):
            total = totals[f'total_{idx}'] or 0
            completed = totals[f'completed_{idx}'] or 0
            rate = round((completed / total * 100), 1) if total > 0 else 0
            result.append({
                'month': ms.strftime('%b %Y'),
                'rate': rate,
            })
        return Response(result)


class BranchAdminListCreateView(APIView):
    """List and create branch admins (superadmin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        if request.user.role != 'superadmin':
            return Response({'detail': 'Only superadmin can view branch admins.'}, status=drf_status.HTTP_403_FORBIDDEN)

        admins = User.objects.filter(role='admin', is_deleted=False).select_related('branch').order_by('first_name')
        data = []
        for u in admins:
            data.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'email': u.email,
                'phone': u.phone,
                'branch': u.branch_id,
                'branch_name': u.branch.name if u.branch else None,
                'is_active': u.is_active,
            })
        return Response(data)

    def post(self, request):
        if request.user.role != 'superadmin':
            return Response({'detail': 'Only superadmin can create branch admins.'}, status=drf_status.HTTP_403_FORBIDDEN)

        username = request.data.get('username')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        email = request.data.get('email', '')
        phone = request.data.get('phone', '')
        branch_id = request.data.get('branch')

        if not username or not password:
            return Response({'detail': 'username and password are required.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        if not branch_id:
            return Response({'detail': 'branch is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'Username already exists.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        from vendors.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return Response({'detail': 'Branch not found.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username, password=password,
            first_name=first_name, last_name=last_name,
            email=email, phone=phone,
            role='admin', branch=branch,
        )
        user.password_plain = password
        user.save(update_fields=['password_plain'])

        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'branch': user.branch_id,
            'branch_name': branch.name,
            'is_active': user.is_active,
        }, status=drf_status.HTTP_201_CREATED)


class BranchAdminDetailView(APIView):
    """Update/delete a branch admin (superadmin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        if request.user.role != 'superadmin':
            return Response({'detail': 'Only superadmin.'}, status=drf_status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk, role='admin')
        except User.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=drf_status.HTTP_404_NOT_FOUND)

        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'email' in request.data:
            user.email = request.data['email']
        if 'phone' in request.data:
            user.phone = request.data['phone']
        if 'branch' in request.data:
            user.branch_id = request.data['branch']
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])
            user.password_plain = request.data['password']
        user.save()

        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'branch': user.branch_id,
            'branch_name': user.branch.name if user.branch else None,
            'is_active': user.is_active,
        })

    def delete(self, request, pk):
        if request.user.role != 'superadmin':
            return Response({'detail': 'Only superadmin.'}, status=drf_status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk, role='admin')
        except User.DoesNotExist:
            return Response({'error': 'Admin not found.'}, status=drf_status.HTTP_404_NOT_FOUND)

        user.delete()  # soft delete
        return Response({'message': 'Admin deleted.'}, status=drf_status.HTTP_204_NO_CONTENT)


class CredentialsListView(APIView):
    """List all user credentials for superadmin."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        if request.user.role != 'superadmin':
            return Response({'detail': 'Only superadmin can view credentials.'}, status=drf_status.HTTP_403_FORBIDDEN)

        qs = User.objects.filter(is_deleted=False).exclude(role='superadmin').select_related('branch')

        role = request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)

        branch_id = request.query_params.get('branch')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search) |
                Q(phone__icontains=search)
            )

        data = []
        for u in qs.order_by('role', 'first_name'):
            data.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role': u.role,
                'branch_name': u.branch.name if u.branch else None,
                'phone': u.phone,
                'is_active': u.is_active,
                'password_plain': u.password_plain or '(created before tracking)',
            })
        return Response(data)


class CredentialResetPasswordView(APIView):
    """Reset a user's password (superadmin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        if request.user.role != 'superadmin':
            return Response({'detail': 'Only superadmin can reset passwords.'}, status=drf_status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=drf_status.HTTP_404_NOT_FOUND)

        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'new_password is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.password_plain = new_password
        user.save(update_fields=['password', 'password_plain'])
        return Response({'message': 'Password reset successfully.'})
