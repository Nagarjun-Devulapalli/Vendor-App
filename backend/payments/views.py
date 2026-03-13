from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import Payment, PaymentEntry
from .serializers import PaymentSerializer, PaymentEntrySerializer
from accounts.permissions import IsAdmin


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = Payment.objects.select_related(
            'activity', 'activity__vendor', 'activity__vendor__user'
        ).prefetch_related('entries', 'activity__occurrences').all()
        user = self.request.user
        if user.role == 'admin' and user.branch:
            qs = qs.filter(activity__branch=user.branch)
        elif user.role == 'superadmin':
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                qs = qs.filter(activity__branch_id=branch_id)
        elif user.role == 'vendor_owner':
            qs = qs.filter(activity__vendor__user=user)
        elif user.role == 'vendor_employee':
            qs = qs.filter(activity__vendor__employees__user=user)

        status_filter = self.request.query_params.get('payment_status')
        if status_filter:
            qs = qs.filter(payment_status=status_filter)
        return qs

    def list(self, request, *args, **kwargs):
        # Auto-fix stale payment statuses from old data
        from decimal import Decimal
        for payment in self.get_queryset():
            paid = payment.total_paid
            due = payment.total_due
            if paid <= Decimal('0.00'):
                expected = 'pending'
            elif due > 0 and paid >= due:
                expected = 'completed'
            elif paid > Decimal('0.00'):
                expected = 'partial'
            else:
                expected = 'pending'
            if payment.payment_status != expected:
                payment.payment_status = expected
                payment.save(update_fields=['payment_status'])
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        """Record a payment entry for this payment."""
        if request.user.role not in ('admin', 'superadmin'):
            return Response(
                {'detail': 'Only admins can record payments.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        payment = self.get_object()
        amount = request.data.get('amount')
        if not amount:
            return Response(
                {'detail': 'amount is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from decimal import Decimal
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError
        except (ValueError, Exception):
            return Response(
                {'detail': 'amount must be a positive number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entry = PaymentEntry.objects.create(
            payment=payment,
            amount=amount,
            paid_by=request.user,
            payment_date=request.data.get('payment_date', timezone.localtime(timezone.now()).date()),
            notes=request.data.get('notes', ''),
        )

        # Handle receipt upload
        receipt = request.FILES.get('receipt')
        if receipt:
            entry.receipt = receipt
            entry.save(update_fields=['receipt'])

        # Auto-update payment status
        payment.update_status()

        serializer = self.get_serializer(payment)
        return Response(serializer.data)


class PaymentEntryViewSet(viewsets.ModelViewSet):
    """View/manage individual payment entries."""
    serializer_class = PaymentEntrySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = PaymentEntry.objects.select_related('payment__activity', 'paid_by').all()
        payment_id = self.request.query_params.get('payment')
        if payment_id:
            qs = qs.filter(payment_id=payment_id)
        return qs

    def get_permissions(self):
        if self.action in ('destroy', 'upload_receipt'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='upload-receipt')
    def upload_receipt(self, request, pk=None):
        """Upload or replace a receipt for a payment entry."""
        entry = self.get_object()
        receipt = request.FILES.get('receipt')
        if not receipt:
            return Response({'detail': 'receipt file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.receipt = receipt
        entry.save(update_fields=['receipt'])
        return Response(PaymentEntrySerializer(entry).data)

    def perform_destroy(self, instance):
        payment = instance.payment
        instance.delete()
        payment.update_status()
