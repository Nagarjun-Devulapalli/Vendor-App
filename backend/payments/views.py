from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer
from accounts.permissions import IsAdmin


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        self._validate_payment_allowed(serializer.validated_data)
        serializer.save()

    def perform_update(self, serializer):
        self._validate_payment_allowed(serializer.validated_data, instance=serializer.instance)
        serializer.save()

    def _validate_payment_allowed(self, validated_data, instance=None):
        """Block payment if activity work is not completed, unless payment_type is daily."""
        activity = validated_data.get('activity') or (instance.activity if instance else None)
        if not activity:
            return

        payment_status = validated_data.get('payment_status') or (instance.payment_status if instance else 'pending')

        # Only validate when trying to mark payment as completed or partial
        if payment_status in ('completed', 'partial'):
            # Daily payment type is exempt — can be paid anytime
            if activity.payment_type == 'daily':
                return
            # For contract and other types, activity must be completed
            if activity.status != 'completed':
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    {'detail': 'Payment cannot be recorded until the activity work is completed. '
                               'Only daily payment type activities can be paid before completion.'}
                )

    def get_queryset(self):
        qs = Payment.objects.select_related('activity', 'activity__vendor').all()
        user = self.request.user
        if user.role == 'superadmin':
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                qs = qs.filter(activity__branch_id=branch_id)
        elif user.role == 'admin' and user.branch:
            qs = qs.filter(activity__branch=user.branch)
        elif user.role == 'vendor_owner':
            qs = qs.filter(activity__vendor__user=user)
        elif user.role == 'vendor_employee':
            qs = qs.filter(activity__vendor__employees__user=user)

        status_filter = self.request.query_params.get('payment_status')
        if status_filter:
            qs = qs.filter(payment_status=status_filter)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='upload-receipt')
    def upload_receipt(self, request, pk=None):
        payment = self.get_object()
        receipt = request.FILES.get('receipt')
        if not receipt:
            return Response({'error': 'No receipt file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        payment.receipt = receipt
        payment.save()
        return Response({'message': 'Receipt uploaded successfully.', 'receipt': payment.receipt.url}, status=status.HTTP_200_OK)
