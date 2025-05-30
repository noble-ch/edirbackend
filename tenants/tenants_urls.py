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
    ResourceViewSet, ResourceAllocationViewSet, ResourceUsageViewSet,PaymentViewSet, PenaltyViewSet, ReminderViewSet, FinancialReportViewSet,
    EmergencyRequestViewSet ,MemberFeedbackViewSet ,MemorialViewSet

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
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'penalties', PenaltyViewSet, basename='penalty')
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'financial-reports', FinancialReportViewSet, basename='financialreport')


router.register(r'emergencies', EmergencyRequestViewSet, basename='emergency')
router.register(r'feedbacks', MemberFeedbackViewSet, basename='feedback')
router.register(r'memorials', MemorialViewSet, basename='memorial')


urlpatterns = [
    path('auth/login/', UserLoginAPIView.as_view(), name='edir-user-login'),
    path('members/create/', member_register, name='member-register'),

    path('reminders/send_monthly_reminders/', 
         ReminderViewSet.as_view({'post': 'send_monthly_reminders'}),
         name='send-monthly-reminders'),
    
    path('members/request-password-reset/', MemberViewSet.as_view({'post': 'request_password_reset'}), name='request-password-reset'),
    path('members/reset-password/', MemberViewSet.as_view({'post': 'reset_password'}), name='reset-password'),
] + router.urls