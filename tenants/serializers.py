# tenants/serializers.py

from django.utils.timezone import now as timezone_now
from rest_framework import serializers
from .models import Member, Spouse, FamilyMember, Representative, Edir, Role
from django.contrib.auth import get_user_model

from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.translation import gettext_lazy as _




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
        fields = ['id', 'role_type', 'assigned_at', 'is_active']
        read_only_fields = ['id', 'assigned_at']

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    edir = serializers.SerializerMethodField(read_only=True)  # Single edir now
    roles = serializers.SerializerMethodField(read_only=True)
    is_edir_head = serializers.SerializerMethodField(read_only=True)
    verification_status = serializers.SerializerMethodField(read_only=True)

    def get_verification_status(self, obj):
        edir_slug = self.context.get('edir_slug')
        if edir_slug:
            try:
                member = Member.objects.get(
                    user__username=obj['username'],
                    edir__slug=edir_slug
                )
                return member.status  # Use member.status directly from the database
            except Member.DoesNotExist:
                return "not_member"
        return None

    def get_edir(self, obj):
        """Returns the single edir the member belongs to"""
        try:
            member = Member.objects.get(user__username=obj['username'])
            return {
                'id': member.edir.id,
                'name': member.edir.name,
                'slug': member.edir.slug,
            }
        except Member.DoesNotExist:
            return None

    def get_roles(self, obj):
        try:
            member = Member.objects.get(user__username=obj['username'])
            return list(member.roles.filter(is_active=True).values_list('role_type', flat=True))
        except Member.DoesNotExist:
            return []

    def get_is_edir_head(self, obj):
        try:
            member = Member.objects.get(user__username=obj['username'])
            return member.edir.head == member.user
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
        
        # Check if user is a member of any edir
        try:
            member = Member.objects.get(user=user)
        except Member.DoesNotExist:
            raise serializers.ValidationError("User is not registered as a member of any Edir")
        
        # For edir-specific login, verify it matches the member's edir
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
            
            update_last_login(None, user)
            
            validation = {
                'access': access_token,
                'refresh': refresh_token,
                'username': user.username,
                'email': user.email,
                'edir': self.get_edir({'username': username}),
                'roles': self.get_roles({'username': username}),
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
        
        
class MemberApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = ['id', 'status']
        read_only_fields = ['id']

    def validate(self, data):
        edir = self.instance.edir
        request_user = self.context['request'].user
        
        # Only Edir head can approve/reject members
        if not (request_user.is_superuser or edir.head == request_user):
            raise serializers.ValidationError("Only Edir head can approve/reject members")
        
        return data

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        
        if new_status != instance.status:
            instance.status = new_status
            instance.processed_by = self.context['request'].user
            instance.processed_at = timezone_now()
            instance.save()
            
            # You could add logic here to send notifications
            # when a member's status changes
            
        return instance
    
class RoleAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'member', 'role_type', 'is_active']
        read_only_fields = ['id']

    def validate(self, data):
        member = data.get('member')
        request_user = self.context['request'].user
        role_type = data.get('role_type')
        
        # Only Edir head can assign roles
        if not (request_user.is_superuser or member.edir.head == request_user):
            raise serializers.ValidationError("Only Edir head can assign roles")
        
        # Prevent assigning MEMBER role (it's auto-assigned)
        if role_type == 'MEMBER':
            raise serializers.ValidationError("MEMBER role is automatically assigned")
        
        # Check if this is an update to existing role
        instance = self.instance
        if instance:
            # For updates, just verify the role isn't being changed to MEMBER
            if role_type == 'MEMBER':
                raise serializers.ValidationError("Cannot change to MEMBER role")
        else:
            # For new assignments, check for duplicate active roles
            if Role.objects.filter(
                member=member,
                role_type=role_type,
                is_active=True
            ).exists():
                raise serializers.ValidationError("This role is already assigned to the member")
        
        return data

    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)


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
        if Member.objects.filter(user__username=data.get('username')).exists():
            raise serializers.ValidationError("User is already a member of an Edir")

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
        member = Member.objects.create(
            user=user,
            status='pending',
            **validated_data
        )    
        Role.objects.create(
            member=member,
            role_type='MEMBER',
            is_active=True,
            assigned_by=user  
        )    

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
    roles = RoleSerializer(many=True, read_only=True)
    
    class Meta:
        model = Member
        fields = [
            'id', 'full_name', 'email', 'phone_number', 'address',
            'city', 'state', 'zip_code', 'home_or_alternate_phone',
            'registration_type', 'edir', 'spouse', 'family_members',
            'representatives', 'created_at', 'updated_at', 'is_active',
            'status', 'roles',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_active', 
                           'status', ]