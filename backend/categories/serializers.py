from rest_framework import serializers
from .models import WorkCategory


class WorkCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkCategory
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']
