from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkCategoryViewSet

router = DefaultRouter()
router.register('categories', WorkCategoryViewSet)

urlpatterns = router.urls
