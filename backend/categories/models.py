from django.db import models
from vendor_portal.mixins import SoftDeleteModel


class WorkCategory(SoftDeleteModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'work categories'

    def __str__(self):
        return self.name
