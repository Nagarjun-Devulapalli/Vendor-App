from rest_framework import viewsets
from .models import WorkCategory
from .serializers import WorkCategorySerializer
from accounts.permissions import IsAdminOrReadOnly


class WorkCategoryViewSet(viewsets.ModelViewSet):
    queryset = WorkCategory.objects.all()
    serializer_class = WorkCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
