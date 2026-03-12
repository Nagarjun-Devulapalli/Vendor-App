from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, ResetPasswordView, ProfileView,
    DashboardStatsView, SpendingTrendsView, CompletionRatesView,
    BranchAdminListCreateView, BranchAdminDetailView,
    CredentialsListView, CredentialResetPasswordView,
)

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
    dashboard_path('branch-admins/', BranchAdminListCreateView.as_view(), name='branch_admin_list'),
    dashboard_path('branch-admins/<int:pk>/', BranchAdminDetailView.as_view(), name='branch_admin_detail'),
    dashboard_path('credentials/', CredentialsListView.as_view(), name='credentials_list'),
    dashboard_path('credentials/<int:pk>/reset-password/', CredentialResetPasswordView.as_view(), name='credential_reset_password'),
]
