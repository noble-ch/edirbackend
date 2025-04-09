# tenants/serializers.py

from rest_framework import serializers
from .models import Member, Spouse, FamilyMember, Representative, Edir, Role
from django.contrib.auth import get_user_model


User = get_user_model()

class EdirSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edir
        fields = ['id', 'name', 'slug', 'description', 'approved', 'head', 'created_at', 'unique_link']
    

class SpouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spouse
        fields = ['full_name', 'email', 'phone_number']

class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = ['full_name', 'gender', 'date_of_birth', 'relationship']

class RepresentativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Representative
        fields = ['full_name', 'phone_number', 'email', 'date_of_designation']
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'role_type', 'date_assigned', 'is_active']
        read_only_fields = ['id', 'date_assigned']

class MemberSerializer(serializers.ModelSerializer):
    spouse = SpouseSerializer(required=False)  # Make always optional
    family_members = FamilyMemberSerializer(many=True, required=False)  # Make always optional
    representatives = RepresentativeSerializer(many=True, required=False)
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Member
        fields = [
            'id', 'username', 'password',
            'full_name', 'email', 'phone_number', 'address',
            'city', 'state', 'zip_code', 'home_or_alternate_phone',
            'registration_type', 'edir', 'spouse', 'family_members',
            'representatives'
        ]
        read_only_fields = ['id']

    def validate(self, data):
        registration_type = data.get('registration_type')
        
        # For family registration, validate required fields
        if registration_type == 'family':
            if 'spouse' not in data or not data['spouse']:
                raise serializers.ValidationError({
                    "spouse": "This field is required for family registration."
                })
            if 'family_members' not in data or not data['family_members']:
                raise serializers.ValidationError({
                    "family_members": "At least one family member is required for family registration."
                })
        
        # For single registration, ensure these fields are not provided
        if registration_type == 'single':
            if 'spouse' in data and data['spouse']:
                raise serializers.ValidationError({
                    "spouse": "This field should not be provided for single registration."
                })
            if 'family_members' in data and data['family_members']:
                raise serializers.ValidationError({
                    "family_members": "This field should not be provided for single registration."
                })
        
        return data

    def create(self, validated_data):
        # Extract user data
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        
        # Create User
        User = get_user_model()
        user = User.objects.create_user(
            username=username,
            password=password,
            email=validated_data.get('email'),
            first_name=validated_data.get('full_name', '').split(' ')[0],
            last_name=' '.join(validated_data.get('full_name', '').split(' ')[1:]) or ''
        )
        
        # Handle nested data - only if present
        spouse_data = validated_data.pop('spouse', None)
        family_members_data = validated_data.pop('family_members', [])
        representatives_data = validated_data.pop('representatives', [])
        
        # Create Member
        member = Member.objects.create(user=user, **validated_data)
        
        # Create related objects only if they exist
        if spouse_data:
            Spouse.objects.create(member=member, **spouse_data)
        
        for fam_data in family_members_data:
            FamilyMember.objects.create(member=member, **fam_data)
            
        for rep_data in representatives_data:
            Representative.objects.create(member=member, **rep_data)
            
        return member
    
class MemberDetailSerializer(serializers.ModelSerializer):
    spouse = SpouseSerializer(required=False)
    family_members = FamilyMemberSerializer(many=True, required=False)
    representatives = RepresentativeSerializer(many=True, required=False)
    edir = EdirSerializer(read_only=True)
    
    class Meta:
        model = Member
        fields = [
            'id', 'full_name', 'email', 'phone_number', 'address',
            'city', 'state', 'zip_code', 'home_or_alternate_phone',
            'registration_type', 'edir', 'spouse', 'family_members',
            'representatives', 'created_at', 'updated_at', 'is_active',
            'current_roles'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_active', 'current_roles']