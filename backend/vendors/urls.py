from rest_framework.routers import DefaultRouter
from .views import BranchViewSet, VendorViewSet, EmployeeViewSet

router = DefaultRouter()
router.register('branches', BranchViewSet)
router.register('vendors', VendorViewSet, basename='vendor')
router.register('employees', EmployeeViewSet, basename='employee')

urlpatterns = router.urls
