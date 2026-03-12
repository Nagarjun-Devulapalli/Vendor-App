from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_CHOICES = [
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('vendor_owner', 'Vendor Owner'),
        ('vendor_employee', 'Vendor Employee'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    branch = models.ForeignKey(
        'vendors.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='users'
    )
    phone = models.CharField(max_length=15, blank=True)
    aadhar_number = models.CharField(max_length=12, blank=True)
    password_plain = models.CharField(max_length=128, blank=True, default='')
    photo = models.ImageField(upload_to='user_photos/', blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=['is_deleted', 'deleted_at', 'is_active'])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.is_active = True
        self.save(update_fields=['is_deleted', 'deleted_at', 'is_active'])
