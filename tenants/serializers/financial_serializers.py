from rest_framework import serializers
from ..models import Payment, Penalty, Reminder, FinancialReport

class PaymentSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    edir_name = serializers.CharField(source='edir.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('created_at', 'verified_at','edir','member')

class PenaltySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    edir_name = serializers.CharField(source='edir.name', read_only=True)
    penalty_type_display = serializers.CharField(source='get_penalty_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Penalty
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at','edir')

class ReminderSerializer(serializers.ModelSerializer):
    reminder_type_display = serializers.CharField(source='get_reminder_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    edir_name = serializers.CharField(source='edir.name', read_only=True)
    
    class Meta:
        model = Reminder
        fields = [
            'id', 'edir', 'edir_name', 'reminder_type', 'reminder_type_display',
            'subject', 'message', 'scheduled_time', 'status', 'status_display',
            'channel', 'channel_display', 'created_at', 'sent_at', 'related_event',
            'related_payment', 'created_by', 'created_by_name', 'recipients'
        ]
        read_only_fields = ['created_at', 'sent_at', 'status']

class FinancialReportSerializer(serializers.ModelSerializer):
    edir_name = serializers.CharField(source='edir.name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.full_name', read_only=True)
    start_date = serializers.DateField(format="%Y-%m-%d")
    end_date = serializers.DateField(format="%Y-%m-%d")
    generated_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    
    class Meta:
        model = FinancialReport
        fields = '__all__'
        read_only_fields = ('generated_at',)