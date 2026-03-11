from django.db import models
from vendor_portal.mixins import SoftDeleteModel


class Payment(SoftDeleteModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('completed', 'Completed'),
    ]

    activity = models.ForeignKey('activities.Activity', on_delete=models.CASCADE, related_name='payments')
    expected_amount = models.DecimalField(max_digits=10, decimal_places=2)
    actual_amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    receipt = models.FileField(upload_to='payment_receipts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment for {self.activity.title} - {self.payment_status}"
