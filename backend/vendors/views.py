from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Branch, Vendor, Employee
from .serializers import BranchSerializer, VendorSerializer, EmployeeSerializer
from accounts.permissions import IsAdmin, IsAdminOrReadOnly


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAdminOrReadOnly]


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Vendor.objects.select_related('user', 'branch').prefetch_related('categories').all()
        user = self.request.user
        if user.role == 'admin' and user.branch:
            qs = qs.filter(branch=user.branch)
        elif user.role == 'superadmin':
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                qs = qs.filter(branch_id=branch_id)
        elif user.role == 'vendor_owner':
            qs = qs.filter(user=user)
        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            qs = qs.filter(id=vendor_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        vendor = self.get_object()
        is_active = request.data.get('is_active')
        if is_active is None:
            return Response({'error': 'is_active field is required'}, status=status.HTTP_400_BAD_REQUEST)

        is_active = bool(is_active)

        # Update vendor user
        vendor.user.is_active = is_active
        vendor.user.save()

        # Cascade to all employees under this vendor
        employee_users = [emp.user for emp in vendor.employees.select_related('user').all()]
        for user in employee_users:
            user.is_active = is_active
            user.save()

        action_text = 'activated' if is_active else 'deactivated'
        return Response({
            'message': f'Vendor {vendor.display_name} and {len(employee_users)} employees {action_text}',
            'is_active': is_active,
            'employees_affected': len(employee_users),
        })

    @action(detail=False, methods=['get'], url_path='by-category')
    def by_category(self, request):
        cat_id = request.query_params.get('cat')
        if not cat_id:
            return Response({'error': 'cat parameter required'}, status=400)
        qs = self.get_queryset().filter(categories__id=cat_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Employee.objects.select_related('user', 'vendor_owner').all()
        user = self.request.user
        if user.role == 'admin' and user.branch:
            qs = qs.filter(vendor_owner__branch=user.branch)
        elif user.role == 'superadmin':
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                qs = qs.filter(vendor_owner__branch_id=branch_id)
        elif user.role == 'vendor_owner':
            qs = qs.filter(vendor_owner__user=user)
        elif user.role == 'vendor_employee':
            qs = qs.filter(user=user)
        vendor_owner = self.request.query_params.get('vendor_owner')
        if vendor_owner:
            qs = qs.filter(vendor_owner_id=vendor_owner)
        return qs

    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        employee = self.get_object()
        user = request.user

        # Only admin or the vendor owner of this employee can toggle
        if user.role == 'vendor_owner' and employee.vendor_owner.user != user:
            return Response({'error': 'You can only manage your own employees'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'vendor_employee':
            return Response({'error': 'Employees cannot perform this action'}, status=status.HTTP_403_FORBIDDEN)

        is_active = request.data.get('is_active')
        if is_active is None:
            return Response({'error': 'is_active field is required'}, status=status.HTTP_400_BAD_REQUEST)

        is_active = bool(is_active)
        employee.user.is_active = is_active
        employee.user.save()

        action_text = 'activated' if is_active else 'deactivated'
        return Response({
            'message': f'Employee {employee.user.get_full_name()} {action_text}',
            'is_active': is_active,
        })
