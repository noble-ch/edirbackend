from rest_framework import serializers
from ..models import Edir, EdirRequest

class EdirSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edir
        fields = ['id', 'name', 'slug', 'description', 'approved', 'head', 'created_at', 'unique_link']

class EdirRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EdirRequest
        fields = [
            'id', 'full_name', 'username', 'email', 'password',
            'edir_name', 'edir_description', 'proposed_cbe_account',
            'proposed_account_holder', 'proposed_address',
            'proposed_initial_deposit', 'created_at', 'status'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'status': {'read_only': True},
            'created_at': {'read_only': True},
        }

    def validate_proposed_cbe_account(self, value):
        if value and not value.isdigit() or len(value) != 13:
            raise serializers.ValidationError("CBE account number must be exactly 13 digits")
        return value

    def create(self, validated_data):
        return EdirRequest.objects.create(**validated_data)
    
class EdirRequestApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = EdirRequest
        fields = ['status']
        read_only_fields = ['processed']

    def validate_status(self, value):
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError("Status must be either 'approved' or 'rejected'")
        return value