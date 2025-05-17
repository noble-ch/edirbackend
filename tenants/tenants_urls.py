from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceViewSet,
    ContributionViewSet,
    EventReportViewSet,
    EventViewSet,
    ExpenseViewSet,
    TaskGroupViewSet,
    TaskViewSet,
    UserLoginAPIView, 
    MemberRegistrationViewSet,
    MemberViewSet,
    ResourceViewSet, ResourceAllocationViewSet, ResourceUsageViewSet,PaymentViewSet, PenaltyViewSet, ReminderViewSet, FinancialReportViewSet

)

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
member_register = MemberRegistrationViewSet.as_view({'post': 'create'})

# Event-related URLs
router.register(r'events', EventViewSet, basename='event')
router.register(r'events/(?P<event_id>\d+)/attendances', AttendanceViewSet, basename='attendance')
router.register(r'events/(?P<event_id>\d+)/contributions', ContributionViewSet, basename='contribution')
router.register(r'events/(?P<event_id>\d+)/expenses', ExpenseViewSet, basename='expense')

# Task Group URLs nested under events
router.register(r'events/(?P<event_id>\d+)/task-groups', TaskGroupViewSet, basename='task-group')
router.register(r'events/(?P<event_id>\d+)/task-groups/(?P<task_group_id>\d+)/tasks', TaskViewSet, basename='task')

# Reports
router.register(r'events/(?P<event_id>\d+)/reports', EventReportViewSet, basename='event-report')

# Resource URLs
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'resource-allocations', ResourceAllocationViewSet, basename='resourceallocation')
router.register(r'resource-usage', ResourceUsageViewSet, basename='resourceusage')

#financial URLs
# router.register(r'payments', PaymentViewSet, basename='payment')
# router.register(r'penalties', PenaltyViewSet, basename='penalty')
# router.register(r'reminders', ReminderViewSet, basename='reminder')
# router.register(r'financial-reports', FinancialReportViewSet, basename='financialreport')


urlpatterns = [
    path('auth/login/', UserLoginAPIView.as_view(), name='edir-user-login'),
    path('members/create/', member_register, name='member-register'),


] + router.urls