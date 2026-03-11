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

    def get_queryset(self):
        qs = Payment.objects.select_related('activity', 'activity__vendor').all()
        user = self.request.user
        if user.role == 'admin' and user.branch:
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
