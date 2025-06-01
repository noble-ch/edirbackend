from django.utils.timezone import now as timezone_now
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from ..models import Member, Spouse, FamilyMember, Representative
from .edir_serializers import EdirSerializer
User = get_user_model()

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

class UserLoginSerializer(serializers.Serializer):
    
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    edir = serializers.SerializerMethodField(read_only=True)
    is_edir_head = serializers.SerializerMethodField(read_only=True)
    verification_status = serializers.SerializerMethodField(read_only=True)
    role = serializers.CharField(read_only=True)

    def get_verification_status(self, obj):
        edir_slug = self.context.get('edir_slug')
        if edir_slug:
            try:
                member = Member.objects.get(
                    user__username=obj['username'],
                    edir__slug=edir_slug
                )
                return member.status  
            except Member.DoesNotExist:
                return "not_member"
        return None

    def get_edir(self, obj):
        try:
            member = Member.objects.get(user__username=obj['username'])
            return {
                'id': member.edir.id,
                'name': member.edir.name,
                'slug': member.edir.slug,
            }
        except Member.DoesNotExist:
            return None

    def get_is_edir_head(self, obj):
        try:
            member = Member.objects.get(user__username=obj['username'])
            return member.edir.head == member.user
        except Member.DoesNotExist:
            return False
        
    def get_role(self, obj):
        try:
            member = Member.objects.get(user__username=obj['username'])
            return member.edir.role
        except Member.DoesNotExist:
            return False

    def validate(self, data):
        username = data['username']
        password = data['password']
        edir_slug = self.context.get('edir_slug')
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError("Invalid login credentials")
        
        if not user.is_active:
            raise serializers.ValidationError("User account is not active")
        
        try:
            member = Member.objects.get(user=user)
        except Member.DoesNotExist:
            raise serializers.ValidationError("User is not registered as a member of any Edir")
        
        if edir_slug and member.edir.slug != edir_slug:
            raise serializers.ValidationError("You are not a member of this Edir")
        
        verification_status = member.status  
        
        if verification_status == "rejected":
            raise serializers.ValidationError("Your membership has been rejected. Please contact the Edir head.")
            
        if verification_status == "pending":
            raise serializers.ValidationError("Your membership is pending approval. Please wait for confirmation.")
        
        try:
            refresh = RefreshToken.for_user(user)
            refresh_token = str(refresh)
            access_token = str(refresh.access_token)
            role = member.role
            update_last_login(None, user)
            
            validation = {
                'access': access_token,
                'refresh': refresh_token,
                'username': user.username,
                'email': user.email,
                'role': role,
                'edir': self.get_edir({'username': username}),
                'is_edir_head': self.get_is_edir_head({'username': username}),
                'verification_status': verification_status,
                'message': self.get_status_message(verification_status)
            }
            
            return validation
        except Exception as e:
            raise serializers.ValidationError(str(e))
    
    def get_status_message(self, status):
        messages = {
            "approved": "Login successful",
            "pending": "Your membership is pending approval",
            "rejected": "Your membership has been rejected",
            "not_member": "You are not a member of this Edir"
        }
        return messages.get(status, "Unknown status")

class MemberSerializer(serializers.ModelSerializer):
    spouse = SpouseSerializer(required=False)
    family_members = FamilyMemberSerializer(many=True, required=False)
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
            'representatives','status',  'created_at', 'updated_at', 'is_active','role','avatar'
        ]
        read_only_fields = ['id']
        
    def validate(self, data):
        registration_type = data.get('registration_type')
        
        if registration_type == 'family':
            if 'spouse' not in data or not data['spouse']:
                raise serializers.ValidationError({
                    "spouse": "This field is required for family registration."
                })
            if 'family_members' not in data or not data['family_members']:
                raise serializers.ValidationError({
                    "family_members": "At least one family member is required for family registration."
                })
        if Member.objects.filter(user__username=data.get('username')).exists():
            raise serializers.ValidationError("User is already a member of an Edir")

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
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        
        User = get_user_model()
        user = User.objects.create_user(
            username=username,
            password=password,
            email=validated_data.get('email'),
            first_name=validated_data.get('full_name', '').split(' ')[0],
            last_name=' '.join(validated_data.get('full_name', '').split(' ')[1:]) or ''
        )
        
        spouse_data = validated_data.pop('spouse', None)
        family_members_data = validated_data.pop('family_members', [])
        representatives_data = validated_data.pop('representatives', [])
        
        member = Member.objects.create(
            user=user,
            status='pending',
            **validated_data
        )    
 
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
            'status', 'role','avatar'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_active', 'status']
        
        
        



class MemberUpdateSerializer(serializers.ModelSerializer):
    spouse = SpouseSerializer(required=False)
    family_members = FamilyMemberSerializer(many=True, required=False)
    representatives = RepresentativeSerializer(many=True, required=False)
    
    class Meta:
        model = Member
        fields = [
            'full_name', 'email', 'phone_number', 'address',
            'city', 'state', 'zip_code', 'home_or_alternate_phone',
            'registration_type', 'spouse', 'family_members',
            'representatives', 'status', 'role'
        ]
        read_only_fields = ['status', 'role']  # Default to read-only, head can override
    
    def update(self, instance, validated_data):
        # Handle nested updates
        spouse_data = validated_data.pop('spouse', None)
        family_members_data = validated_data.pop('family_members', [])
        representatives_data = validated_data.pop('representatives', [])
        
        # Update main member fields
        instance = super().update(instance, validated_data)
        
        # Update spouse if provided
        if spouse_data:
            if hasattr(instance, 'spouse'):
                for attr, value in spouse_data.items():
                    setattr(instance.spouse, attr, value)
                instance.spouse.save()
            else:
                Spouse.objects.create(member=instance, **spouse_data)
        
        # Update family members - this is a simple implementation
        # In production, you might want more sophisticated handling
        if family_members_data:
            instance.family_members.all().delete()
            for fam_data in family_members_data:
                FamilyMember.objects.create(member=instance, **fam_data)
        
        # Update representatives
        if representatives_data:
            instance.representatives.all().delete()
            for rep_data in representatives_data:
                Representative.objects.create(member=instance, **rep_data)
        
        return instance