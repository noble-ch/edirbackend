from rest_framework import serializers
from ..models import Event, Attendance, Contribution, Expense, EventReport
from django.core.validators import MinValueValidator

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_type', 'start_date', 'end_date', 
                 'location', 'created_by', 'edir', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_by', 'created_at','edir',]
        
        created_by_name = serializers.CharField(source='created_by.user_name', read_only=True)

class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_profile_picture = serializers.CharField(source='member.profile_picture', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'event', 'member', 'member_name', 'member_profile_picture',
            'status', 'actual_attendance', 'responded_at', 'note'
        ]
        read_only_fields = ['id', 'responded_at', 'event', 'member']
class ContributionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = Contribution
        fields = ['id', 'event', 'member', 'member_name', 'amount', 'payment_method', 
                 'payment_date', 'confirmed_by', 'confirmed_at', 'note']
        read_only_fields = ['id', 'confirmed_by', 'confirmed_at', 'event', 'member', 'payment_date']

class ExpenseSerializer(serializers.ModelSerializer):
    spent_by_name = serializers.CharField(source='spent_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Expense
        fields = ['id', 'event', 'description', 'amount', 'spent_by', 'spent_by_name', 
                 'spent_date', 'receipt', 'approved_by', 'approved_by_name', 'approved_at']
        read_only_fields = ['id', 'approved_by', 'approved_at', 'event', 'spent_by', 'receipt']

class EventReportSerializer(serializers.ModelSerializer):
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = EventReport
        fields = ['id', 'event', 'event_title', 'prepared_by', 'prepared_by_name',
                 'attendance_summary', 'financial_summary', 'notes',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'event', 'prepared_by']