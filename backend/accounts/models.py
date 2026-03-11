from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
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
    photo = models.ImageField(upload_to='user_photos/', blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
