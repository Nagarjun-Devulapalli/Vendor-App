from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, ResetPasswordView, ProfileView, DashboardStatsView, SpendingTrendsView, CompletionRatesView, BranchAdminViewSet, UserCredentialViewSet

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
]

# Dashboard URLs are mounted under api/ not api/auth/
from django.urls import path as dashboard_path
dashboard_urlpatterns = [
    dashboard_path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    dashboard_path('dashboard/spending-trends/', SpendingTrendsView.as_view(), name='spending_trends'),
    dashboard_path('dashboard/completion-rates/', CompletionRatesView.as_view(), name='completion_rates'),
    dashboard_path('credentials/', UserCredentialViewSet.as_view({'get': 'list'}), name='credentials_list'),
    dashboard_path('credentials/<int:pk>/reset-password/', UserCredentialViewSet.as_view({'patch': 'reset_password'}), name='credentials_reset_password'),
    dashboard_path('branch-admins/', BranchAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='branch_admin_list'),
    dashboard_path('branch-admins/<int:pk>/', BranchAdminViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='branch_admin_detail'),
]
