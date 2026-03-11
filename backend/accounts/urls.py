from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, ProfileView, DashboardStatsView, SpendingTrendsView, CompletionRatesView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
]

# Dashboard URLs are mounted under api/ not api/auth/
from django.urls import path as dashboard_path
dashboard_urlpatterns = [
    dashboard_path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    dashboard_path('dashboard/spending-trends/', SpendingTrendsView.as_view(), name='spending_trends'),
    dashboard_path('dashboard/completion-rates/', CompletionRatesView.as_view(), name='completion_rates'),
]
