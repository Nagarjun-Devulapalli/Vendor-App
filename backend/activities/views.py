from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.utils import timezone

from .models import Activity, ActivityOccurrence, OccurrenceAssignment, WorkLog
from .serializers import ActivitySerializer, OccurrenceSerializer, WorkLogSerializer
from accounts.permissions import IsAdmin
from vendors.models import Employee


def generate_initial_occurrence(activity):
    """Create the first occurrence on the activity's start_date."""
    ActivityOccurrence.objects.get_or_create(
        activity=activity,
        scheduled_date=activity.start_date,
    )


def ensure_today_occurrences(user):
    """Auto-create today's occurrence for all active (non-completed) activities.
    Called on-the-fly when /occurrences/today/ is requested."""
    today = timezone.localtime(timezone.now()).date()

    # Get active activities scoped to user
    activities = Activity.objects.exclude(status__in=['completed', 'cancelled'])
    if user.role == 'admin' and user.branch:
        activities = activities.filter(branch=user.branch)
    elif user.role == 'vendor_owner':
        activities = activities.filter(vendor__user=user)
    elif user.role == 'vendor_employee':
        activities = activities.filter(vendor__employees__user=user)

    # Only for activities that have started
    activities = activities.filter(start_date__lte=today)

    for activity in activities:
        ActivityOccurrence.objects.get_or_create(
            activity=activity,
            scheduled_date=today,
        )


class ActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Activity.objects.select_related('vendor', 'category', 'branch').annotate(
            occurrence_count=Count('occurrences')
        )
        user = self.request.user
        if user.role == 'admin' and user.branch:
            qs = qs.filter(branch=user.branch)
        elif user.role == 'vendor_owner':
            qs = qs.filter(vendor__user=user)
        elif user.role == 'vendor_employee':
            qs = qs.filter(vendor__employees__user=user)

        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        type_filter = self.request.query_params.get('activity_type')
        if type_filter:
            qs = qs.filter(activity_type=type_filter)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='mark-complete')
    def mark_complete(self, request, pk=None):
        """Mark an activity as completed. Stops new occurrences from being created."""
        activity = self.get_object()
        activity.status = 'completed'
        activity.save(update_fields=['status'])
        serializer = self.get_serializer(activity)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        activity = serializer.save(branch=user.branch)
        generate_initial_occurrence(activity)

    @action(detail=True, methods=['get'])
    def occurrences(self, request, pk=None):
        activity = self.get_object()
        occ = activity.occurrences.select_related('completed_by').prefetch_related('work_logs__user', 'assignments__employee').all()
        serializer = OccurrenceSerializer(occ, many=True)
        return Response(serializer.data)


class OccurrenceViewSet(viewsets.ModelViewSet):
    serializer_class = OccurrenceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = ActivityOccurrence.objects.select_related(
            'activity', 'activity__category', 'activity__vendor', 'completed_by'
        ).prefetch_related('work_logs__user', 'assignments__employee').annotate(
            work_log_count=Count('work_logs')
        )
        user = self.request.user
        if user.role == 'admin' and user.branch:
            qs = qs.filter(activity__branch=user.branch)
        elif user.role == 'vendor_owner':
            qs = qs.filter(activity__vendor__user=user)
        elif user.role == 'vendor_employee':
            qs = qs.filter(assignments__employee=user)
        return qs

    @action(detail=False, methods=['get'])
    def today(self, request):
        # Auto-create today's occurrences for all active activities
        ensure_today_occurrences(request.user)
        today = timezone.localtime(timezone.now()).date()
        qs = self.get_queryset().filter(scheduled_date=today)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'completed' and not instance.completed_by:
            instance.completed_by = self.request.user
            instance.completed_at = timezone.now()
            instance.save()

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        if request.user.role != 'vendor_owner':
            return Response(
                {'detail': 'Only vendor owners can assign tasks.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        occurrence = self.get_object()

        # Validate: occurrence's activity belongs to this vendor
        try:
            vendor = request.user.vendor_profile
        except Exception:
            return Response(
                {'detail': 'Vendor profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if occurrence.activity.vendor_id != vendor.id:
            return Response(
                {'detail': 'This occurrence does not belong to your vendor.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        employee_id = request.data.get('employee_id')

        if employee_id is None:
            return Response(
                {'detail': 'employee_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate: employee belongs to this vendor
        try:
            employee = Employee.objects.select_related('user').get(
                id=employee_id, vendor_owner=vendor
            )
        except Employee.DoesNotExist:
            return Response(
                {'detail': 'Employee not found or does not belong to your vendor.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        OccurrenceAssignment.objects.get_or_create(
            occurrence=occurrence, employee=employee.user
        )
        occurrence.refresh_from_db()
        serializer = self.get_serializer(occurrence)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unassign(self, request, pk=None):
        if request.user.role != 'vendor_owner':
            return Response(
                {'detail': 'Only vendor owners can unassign tasks.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        occurrence = self.get_object()

        try:
            vendor = request.user.vendor_profile
        except Exception:
            return Response(
                {'detail': 'Vendor profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if occurrence.activity.vendor_id != vendor.id:
            return Response(
                {'detail': 'This occurrence does not belong to your vendor.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        employee_id = request.data.get('employee_id')

        if employee_id is None:
            # Unassign all
            occurrence.assignments.all().delete()
        else:
            # Unassign specific employee
            occurrence.assignments.filter(employee_id=employee_id).delete()

        occurrence.refresh_from_db()
        serializer = self.get_serializer(occurrence)
        return Response(serializer.data)


class WorkLogViewSet(viewsets.ModelViewSet):
    serializer_class = WorkLogSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = WorkLog.objects.select_related('user', 'occurrence', 'reviewed_by').all()
        occurrence_id = self.request.query_params.get('occurrence')
        if occurrence_id:
            qs = qs.filter(occurrence_id=occurrence_id)
        return qs

    def perform_create(self, serializer):
        work_log = serializer.save(user=self.request.user, status='in_progress')
        occurrence = work_log.occurrence
        if occurrence.status == 'pending':
            occurrence.status = 'in_progress'
            occurrence.save(update_fields=['status'])

    @action(detail=True, methods=['patch'], url_path='complete')
    def complete(self, request, pk=None):
        work_log = self.get_object()
        after_photo = request.FILES.get('after_photo')
        if not after_photo:
            return Response(
                {'detail': 'after_photo is required to complete a work log.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        work_log.after_photo = after_photo
        work_log.after_photo_taken_at = timezone.now()
        work_log.status = 'completed'
        work_log.save(update_fields=['after_photo', 'after_photo_taken_at', 'status'])

        serializer = self.get_serializer(work_log)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='review')
    def review(self, request, pk=None):
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Only admins can review work logs.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        work_log = self.get_object()
        approval_status = request.data.get('approval_status')
        if approval_status not in ('approved', 'rejected'):
            return Response(
                {'detail': 'approval_status must be "approved" or "rejected".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        work_log.approval_status = approval_status
        work_log.rejection_reason = request.data.get('rejection_reason', '')
        work_log.reviewed_by = request.user
        work_log.reviewed_at = timezone.now()
        work_log.save()

        if approval_status == 'approved':
            # Fresh fetch to avoid stale cached data
            occurrence = ActivityOccurrence.objects.prefetch_related('assignments').get(
                pk=work_log.occurrence_id
            )
            if occurrence.status != 'completed':
                assigned_ids = set(occurrence.assignments.values_list('employee_id', flat=True))
                if assigned_ids:
                    # All assigned employees must have an approved + completed work log
                    approved_user_ids = set(
                        WorkLog.objects.filter(
                            occurrence_id=occurrence.pk,
                            status='completed',
                            approval_status='approved',
                        ).values_list('user_id', flat=True)
                    )
                    all_approved = assigned_ids.issubset(approved_user_ids)
                else:
                    # No assignments — mark complete when any work log is approved
                    all_approved = True

                if all_approved:
                    occurrence.status = 'completed'
                    occurrence.completed_by = request.user
                    occurrence.completed_at = timezone.now()
                    occurrence.save(update_fields=['status', 'completed_by', 'completed_at'])

        serializer = self.get_serializer(work_log)
        return Response(serializer.data)
