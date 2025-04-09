from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    EdirDashboardView, 
    edir_unique_link_redirect, 
    MemberRegistrationViewSet,
    MemberViewSet
)

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')

member_register = MemberRegistrationViewSet.as_view({'post': 'create'})

urlpatterns = [
    path('', edir_unique_link_redirect, name='edir_redirect'),
    path('dashboard/', EdirDashboardView.as_view(), name='edir_dashboard'),
    path('member/create/', member_register, name='member-register'),
] + router.urls