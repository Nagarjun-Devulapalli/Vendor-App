from django.conf import settings
from django.db import models
from django.utils import timezone
from vendor_portal.mixins import SoftDeleteModel


class Activity(SoftDeleteModel):
    ACTIVITY_TYPES = [
        ('one_time', 'One Time'),
        ('long_term', 'Long Term'),
        ('recurring', 'Recurring'),
    ]
    PAYMENT_TYPES = [
        ('contract', 'Contract'),
        ('daily', 'Daily Wage'),
        ('per_occurrence', 'Per Occurrence'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    branch = models.ForeignKey('vendors.Branch', on_delete=models.CASCADE, related_name='activities')
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.CASCADE, related_name='activities')
    category = models.ForeignKey(
        'categories.WorkCategory', on_delete=models.SET_NULL, null=True, blank=True, related_name='activities'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    recurrence_interval_days = models.IntegerField(null=True, blank=True)
    expected_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='contract')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'activities'

    def __str__(self):
        return self.title

    @property
    def is_overdue(self):
        if self.end_date and self.status not in ('completed', 'cancelled'):
            return self.end_date < timezone.now().date()
        return False


class ActivityOccurrence(SoftDeleteModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    ]

    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='occurrences')
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through='OccurrenceAssignment',
        related_name='assigned_occurrences', blank=True
    )

    def __str__(self):
        return f"{self.activity.title} - {self.scheduled_date}"


class OccurrenceAssignment(models.Model):
    occurrence = models.ForeignKey(ActivityOccurrence, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='occurrence_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('occurrence', 'employee')

    def __str__(self):
        return f"{self.employee.get_full_name()} -> {self.occurrence}"


class WorkLog(SoftDeleteModel):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    occurrence = models.ForeignKey(ActivityOccurrence, on_delete=models.CASCADE, related_name='work_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    before_photo = models.ImageField(upload_to='work_logs/before/', blank=True, null=True)
    before_photo_taken_at = models.DateTimeField(null=True, blank=True)
    after_photo = models.ImageField(upload_to='work_logs/after/', blank=True, null=True)
    after_photo_taken_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    description = models.TextField(blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_logs'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"WorkLog for {self.occurrence} by {self.user}"
