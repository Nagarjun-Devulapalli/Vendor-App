from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, PaymentEntryViewSet

router = DefaultRouter()
router.register('payments', PaymentViewSet, basename='payment')
router.register('payment-entries', PaymentEntryViewSet, basename='payment-entry')

urlpatterns = router.urls
