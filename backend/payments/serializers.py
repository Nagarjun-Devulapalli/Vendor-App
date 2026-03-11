from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    vendor_name = serializers.CharField(source='activity.vendor.display_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'activity', 'activity_title', 'vendor_name',
            'expected_amount', 'actual_amount_paid', 'payment_status',
            'payment_date', 'notes', 'receipt', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        instance = self.instance
        activity = data.get('activity') or (instance.activity if instance else None)
        expected = data.get('expected_amount') or (instance.expected_amount if instance else None)
        paid = data.get('actual_amount_paid') or (instance.actual_amount_paid if instance else 0)

        # Auto-fill expected_amount from activity cost if not provided
        if not expected or expected == 0:
            if activity:
                expected = activity.expected_cost
                data['expected_amount'] = expected

        if expected and paid > expected:
            raise serializers.ValidationError(
                {'actual_amount_paid': f'Amount paid (₹{paid}) cannot exceed the total amount (₹{expected}).'}
            )

        # Prevent duplicate payments for the same activity (only on create)
        if not instance and activity:
            existing = Payment.objects.filter(activity=activity).exclude(payment_status='completed').first()
            if existing:
                raise serializers.ValidationError(
                    {'activity': f'A payment record already exists for this activity. '
                                 f'Use the existing payment (ID: {existing.id}) to add more payments.'}
                )

        return data

    def create(self, validated_data):
        return super().create(validated_data)
