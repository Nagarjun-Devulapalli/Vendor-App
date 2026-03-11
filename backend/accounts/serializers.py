from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserCredential


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
        from .models import User
        # Check if user exists and is inactive
        try:
            existing_user = User.objects.get(username=data['username'])
            if not existing_user.is_active:
                raise serializers.ValidationError(
                    'Your account is currently inactive. Please ask the school admin to activate your account.'
                )
        except User.DoesNotExist:
            pass

        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        data['user'] = user
        return data


class ResetPasswordSerializer(serializers.Serializer):
    username = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        try:
            User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User with this username does not exist.')
        return value


class BranchAdminSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True, default=None)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'branch', 'branch_name', 'is_active', 'password']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data['role'] = 'admin'
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        if password:
            from .models import UserCredential
            UserCredential.objects.create(user=user, username=user.username, password_plain=password, role='admin')
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserCredentialSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    branch_name = serializers.CharField(source='user.branch.name', read_only=True, default=None)
    branch_id = serializers.IntegerField(source='user.branch_id', read_only=True, default=None)
    phone = serializers.CharField(source='user.phone', read_only=True, default='')
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)

    class Meta:
        model = UserCredential
        fields = ['id', 'username', 'password_plain', 'role', 'first_name', 'last_name', 'branch_name', 'branch_id', 'phone', 'is_active', 'created_at']


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
