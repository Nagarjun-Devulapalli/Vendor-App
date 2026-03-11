from rest_framework import serializers
from .models import Payment, PaymentEntry


class PaymentEntrySerializer(serializers.ModelSerializer):
    paid_by_name = serializers.CharField(source='paid_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = PaymentEntry
        fields = [
            'id', 'payment', 'amount', 'paid_by', 'paid_by_name',
            'payment_date', 'notes', 'receipt', 'created_at',
        ]
        read_only_fields = ['id', 'paid_by', 'paid_by_name', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    vendor_name = serializers.CharField(source='activity.vendor.display_name', read_only=True)
    payment_type = serializers.CharField(source='activity.payment_type', read_only=True)
    activity_type = serializers.CharField(source='activity.activity_type', read_only=True)
    activity_status = serializers.CharField(source='activity.status', read_only=True)
    rate = serializers.DecimalField(source='activity.expected_cost', read_only=True, max_digits=10, decimal_places=2)
    total_due = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)
    balance_remaining = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)
    extra_paid = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)
    entries = PaymentEntrySerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'activity', 'activity_title', 'vendor_name',
            'payment_type', 'activity_type', 'activity_status', 'rate',
            'total_due', 'total_paid', 'balance_remaining', 'extra_paid',
            'payment_status', 'entries', 'created_at',
        ]
        read_only_fields = ['id', 'payment_status', 'created_at']
