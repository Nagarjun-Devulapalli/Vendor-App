from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'branch', 'branch_name', 'phone', 'aadhar_number', 'photo']
        read_only_fields = ['id', 'username']


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        data['user'] = user
        return data


class ProfileSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True, default=None)
    vendor_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'branch', 'branch_name', 'phone', 'aadhar_number', 'photo', 'vendor_id']

    def get_vendor_id(self, obj):
        if obj.role == 'vendor_owner' and hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.id
        if obj.role == 'vendor_employee' and hasattr(obj, 'employee_profile'):
            return obj.employee_profile.vendor_owner_id
        return None
