# serializers.py
from rest_framework import serializers
from ..models import Reminder

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
        read_only_fields = ['created_at', 'sent_at', 'status','edir']