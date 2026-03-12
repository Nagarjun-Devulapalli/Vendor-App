from rest_framework.routers import DefaultRouter
from .views import ActivityViewSet, OccurrenceViewSet, WorkLogViewSet

router = DefaultRouter()
router.register('activities', ActivityViewSet, basename='activity')
router.register('occurrences', OccurrenceViewSet, basename='occurrence')
router.register('work-logs', WorkLogViewSet, basename='worklog')

urlpatterns = router.urls
