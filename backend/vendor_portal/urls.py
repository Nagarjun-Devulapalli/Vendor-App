from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts.urls import dashboard_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('vendors.urls')),
    path('api/', include('categories.urls')),
    path('api/', include('activities.urls')),
    path('api/', include('payments.urls')),
] + [path('api/', include(dashboard_urlpatterns))] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
