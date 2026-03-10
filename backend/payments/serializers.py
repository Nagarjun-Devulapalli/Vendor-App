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
            'payment_date', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        activity = validated_data.get('activity')
        if activity and (not validated_data.get('expected_amount') or validated_data['expected_amount'] == 0):
            validated_data['expected_amount'] = activity.expected_cost
        return super().create(validated_data)
