from django.utils import timezone
from rest_framework import serializers
from .models import Activity, ActivityOccurrence, WorkLog


class WorkLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = WorkLog
        fields = [
            'id', 'occurrence', 'user', 'user_name',
            'before_photo', 'before_photo_taken_at',
            'after_photo', 'after_photo_taken_at',
            'description', 'approval_status', 'rejection_reason',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at',
        ]
        read_only_fields = [
            'id', 'user', 'user_name', 'before_photo_taken_at', 'after_photo_taken_at',
            'approval_status', 'rejection_reason', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at',
        ]

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        now = timezone.now()
        if validated_data.get('before_photo'):
            validated_data['before_photo_taken_at'] = now
        if validated_data.get('after_photo'):
            validated_data['after_photo_taken_at'] = now
        return super().create(validated_data)

    def update(self, instance, validated_data):
        now = timezone.now()
        if 'before_photo' in validated_data and validated_data['before_photo']:
            validated_data['before_photo_taken_at'] = now
        if 'after_photo' in validated_data and validated_data['after_photo']:
            validated_data['after_photo_taken_at'] = now
        return super().update(instance, validated_data)


class OccurrenceSerializer(serializers.ModelSerializer):
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    category_name = serializers.CharField(source='activity.category.name', read_only=True, default=None)
    description = serializers.CharField(source='activity.description', read_only=True)
    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True, default=None)
    work_logs = WorkLogSerializer(many=True, read_only=True)
    work_log_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ActivityOccurrence
        fields = [
            'id', 'activity', 'activity_title', 'category_name', 'description',
            'scheduled_date', 'status', 'completed_by', 'completed_by_name',
            'completed_at', 'work_logs', 'work_log_count',
        ]
        read_only_fields = ['id', 'activity', 'scheduled_date', 'completed_at']


class ActivitySerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.display_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    is_overdue = serializers.BooleanField(read_only=True)
    occurrence_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Activity
        fields = [
            'id', 'branch', 'vendor', 'vendor_name', 'category', 'category_name',
            'title', 'description', 'activity_type', 'start_date', 'end_date',
            'recurrence_interval_days', 'expected_cost', 'payment_type', 'status',
            'is_overdue', 'occurrence_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {'branch': {'required': False}}
