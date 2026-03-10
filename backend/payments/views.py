from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
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
