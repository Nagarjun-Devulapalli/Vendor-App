from django.conf import settings
from django.db import models
from django.utils import timezone
from decimal import Decimal
from vendor_portal.mixins import SoftDeleteModel


class Payment(SoftDeleteModel):
    """One Payment per Activity. Tracks total_due vs total_paid via PaymentEntries."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('completed', 'Completed'),
    ]

    activity = models.OneToOneField('activities.Activity', on_delete=models.CASCADE, related_name='payment')
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_due(self):
        """Computed based on activity's payment_type."""
        activity = self.activity
        if activity.payment_type == 'contract':
            return activity.expected_cost

        elif activity.payment_type == 'daily':
            daily_rate = activity.expected_cost
            if activity.status == 'completed':
                last_occ = activity.occurrences.filter(
                    status='completed', completed_at__isnull=False
                ).order_by('-completed_at').first()
                if last_occ:
                    end = last_occ.completed_at.date()
                else:
                    end = timezone.localtime(timezone.now()).date()
            else:
                end = timezone.localtime(timezone.now()).date()
            start = activity.start_date
            days = max((end - start).days + 1, 1)
            return daily_rate * days

        elif activity.payment_type == 'per_occurrence':
            rate = activity.expected_cost
            completed_count = activity.occurrences.filter(status='completed').count()
            return rate * completed_count

        return activity.expected_cost

    @property
    def total_paid(self):
        return self.entries.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def balance_remaining(self):
        diff = self.total_due - self.total_paid
        return max(diff, Decimal('0.00'))

    @property
    def extra_paid(self):
        diff = self.total_paid - self.total_due
        return max(diff, Decimal('0.00'))

    def update_status(self):
        """Auto-update payment status based on total_paid vs total_due."""
        paid = self.total_paid
        due = self.total_due
        if paid <= Decimal('0.00'):
            self.payment_status = 'pending'
        elif paid >= due:
            self.payment_status = 'completed'
        else:
            self.payment_status = 'partial'
        self.save(update_fields=['payment_status'])

    def __str__(self):
        return f"Payment for {self.activity.title} - {self.payment_status}"


class PaymentEntry(models.Model):
    """Individual payment record. Each 'Pay Now' click creates one entry."""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='entries')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    payment_date = models.DateField()
    notes = models.TextField(blank=True)
    receipt = models.FileField(upload_to='payment_receipts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'payment entries'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"₹{self.amount} on {self.payment_date} for {self.payment.activity.title}"
