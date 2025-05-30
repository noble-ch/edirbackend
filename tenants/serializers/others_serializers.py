from rest_framework import serializers
from ..models import EmergencyRequest, MemberFeedback, Memorial
from .member_serializers import MemberSerializer 

class EmergencyRequestSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)
    
    class Meta:
        model = EmergencyRequest
        fields = '__all__'
        read_only_fields = ('edir', 'member', 'created_at', 'updated_at')

class MemberFeedbackSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)
    
    class Meta:
        model = MemberFeedback
        fields = '__all__'
        read_only_fields = ('edir', 'status', 'responded_by', 'responded_at')

class MemorialSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)
    created_by = MemberSerializer(read_only=True)
    
    class Meta:
        model = Memorial
        fields = '__all__'
        read_only_fields = ('edir', 'created_by')