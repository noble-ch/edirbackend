from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceViewSet,
    ContributionViewSet,
    EventReportViewSet,
    EventViewSet,
    ExpenseViewSet,
    RoleAssignmentViewSet,
    TaskGroupViewSet,
    TaskViewSet,
    UserLoginAPIView, 
    MemberRegistrationViewSet,
    MemberViewSet,
    MemberApprovalViewSet,
)

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
member_register = MemberRegistrationViewSet.as_view({'post': 'create'})
router.register(r'member-approvals', MemberApprovalViewSet, basename='member-approval')
router.register(r'role-assignments', RoleAssignmentViewSet, basename='role-assignment')

# Event-related URLs
router.register(r'events', EventViewSet, basename='event')
router.register(r'events/(?P<event_id>\d+)/attendances', AttendanceViewSet, basename='attendance')
router.register(r'events/(?P<event_id>\d+)/contributions', ContributionViewSet, basename='contribution')
router.register(r'events/(?P<event_id>\d+)/expenses', ExpenseViewSet, basename='expense')


# Coordinator-specific URLs
router.register(r'task-groups', TaskGroupViewSet, basename='task-group')
router.register(r'task-groups/(?P<task_group_id>\d+)/tasks', TaskViewSet, basename='task')
router.register(r'events/(?P<event_id>\d+)/reports', EventReportViewSet, basename='event-report')


urlpatterns = [
    path('auth/login/', UserLoginAPIView.as_view(), name='edir-user-login'),
    path('members/create/', member_register, name='member-register'),
] + router.urls