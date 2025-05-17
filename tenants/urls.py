from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import EdirRequestViewSet, UserLoginAPIView

router = DefaultRouter()
router.register(r'edir/requests', EdirRequestViewSet, basename='edir-request')

urlpatterns = [
    path('auth/login/', UserLoginAPIView.as_view(), name='edir-user-login'),
] + router.urls