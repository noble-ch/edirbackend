# tenants/urls.py
from django.urls import path
from .views import EdirRequestAPIView, UserLoginAPIView




urlpatterns = [
    path('edir/request/', EdirRequestAPIView.as_view(), name='edir_request_api'),
    path('api/auth/login/', UserLoginAPIView.as_view(), name='edir-user-login'),



]
