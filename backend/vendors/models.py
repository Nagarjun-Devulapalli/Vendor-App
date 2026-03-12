from django.conf import settings
from django.db import models
from vendor_portal.mixins import SoftDeleteModel


class Branch(SoftDeleteModel):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'branches'

    def __str__(self):
        return self.name


class Vendor(SoftDeleteModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_profile'
    )
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='vendors')
    company_name = models.CharField(max_length=200, blank=True, default='')
    categories = models.ManyToManyField('categories.WorkCategory', blank=True, related_name='vendors')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def display_name(self):
        return self.company_name or self.user.get_full_name() or self.user.username

    def __str__(self):
        return self.display_name

    def delete(self, using=None, keep_parents=False):
        # Soft delete the linked user too
        self.user.delete()
        super().delete(using=using, keep_parents=keep_parents)


class Employee(SoftDeleteModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='employee_profile'
    )
    vendor_owner = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='employees')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} (Employee of {self.vendor_owner})"

    def delete(self, using=None, keep_parents=False):
        self.user.delete()
        super().delete(using=using, keep_parents=keep_parents)
