# tenants/urls.py
from django.urls import path
from .views import edir_request_view


urlpatterns = [
    path('register/', edir_request_view, name='edir_request'),
]
