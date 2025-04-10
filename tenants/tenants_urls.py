from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    EdirDashboardView,
    RoleAssignmentViewSet,
    UserLoginAPIView, 
    edir_unique_link_redirect, 
    MemberRegistrationViewSet,
    MemberViewSet,
    MemberApprovalViewSet,
)

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
router.register(r'member-approvals', MemberApprovalViewSet, basename='member-approval')
router.register(r'role-assignments', RoleAssignmentViewSet, basename='role-assignment')



member_register = MemberRegistrationViewSet.as_view({'post': 'create'})

urlpatterns = [
    path('', edir_unique_link_redirect, name='edir_redirect'),
    path('auth/login/', UserLoginAPIView.as_view(), name='edir-user-login'),
    path('dashboard/', EdirDashboardView.as_view(), name='edir_dashboard'),
    path('members/create/', member_register, name='member-register'),


    
] + router.urls