import string
import random
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Branch, Vendor, Employee
from accounts.serializers import UserSerializer

User = get_user_model()


def generate_password(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'address', 'city', 'created_at']
        read_only_fields = ['id', 'created_at']


class VendorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    display_name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    category_names = serializers.SerializerMethodField()
    # Write fields
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    aadhar_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo = serializers.ImageField(write_only=True, required=False)
    category_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Vendor
        fields = [
            'id', 'user', 'display_name', 'branch', 'branch_name', 'company_name', 'categories',
            'category_names', 'created_at',
            'first_name', 'last_name', 'phone', 'aadhar_number', 'photo', 'category_ids',
        ]
        read_only_fields = ['id', 'created_at', 'user']
        extra_kwargs = {'company_name': {'required': False}}

    def get_category_names(self, obj):
        return list(obj.categories.values_list('name', flat=True))

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        phone = validated_data.pop('phone', '')
        aadhar_number = validated_data.pop('aadhar_number', '')
        photo = validated_data.pop('photo', None)
        category_ids = validated_data.pop('category_ids', [])

        username = f"vendor_{phone}" if phone else f"vendor_{random.randint(10000, 99999)}"
        password = generate_password()

        user = User.objects.create_user(
            username=username, password=password,
            first_name=first_name, last_name=last_name,
            role='vendor_owner', phone=phone, aadhar_number=aadhar_number,
            branch=validated_data.get('branch'),
        )
        if photo:
            user.photo = photo
            user.save()

        vendor = Vendor.objects.create(user=user, **validated_data)
        if category_ids:
            vendor.categories.set(category_ids)

        self._generated_password = password
        self._generated_username = username
        return vendor

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if hasattr(self, '_generated_password'):
            data['credentials'] = {
                'username': self._generated_username,
                'password': self._generated_password,
            }
        return data


class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    # Write fields
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    aadhar_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Employee
        fields = ['id', 'user', 'vendor_owner', 'created_at', 'first_name', 'last_name', 'phone', 'aadhar_number', 'photo']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        phone = validated_data.pop('phone', '')
        aadhar_number = validated_data.pop('aadhar_number', '')
        photo = validated_data.pop('photo', None)

        username = f"emp_{phone}" if phone else f"emp_{random.randint(10000, 99999)}"
        password = generate_password()

        vendor_owner = validated_data['vendor_owner']
        user = User.objects.create_user(
            username=username, password=password,
            first_name=first_name, last_name=last_name,
            role='vendor_employee', phone=phone, aadhar_number=aadhar_number,
            branch=vendor_owner.branch,
        )
        if photo:
            user.photo = photo
            user.save()

        employee = Employee.objects.create(user=user, **validated_data)
        self._generated_password = password
        self._generated_username = username
        return employee

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if hasattr(self, '_generated_password'):
            data['credentials'] = {
                'username': self._generated_username,
                'password': self._generated_password,
            }
        return data
