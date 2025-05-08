# tenants/serializers.py

from .models import Event, EventReport, TaskGroup ,Task
from django.utils.timezone import now as timezone_now
from rest_framework import serializers
from .models import Attendance, Contribution, Expense, Member, Spouse, FamilyMember, Representative, Edir
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


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    edir = serializers.SerializerMethodField(read_only=True)  # Single edir now
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
            'representatives','status',  'created_at', 'updated_at', 'is_active','role'
        ]
        read_only_fields = ['id']
        def get_fields(self):
            fields = super().get_fields()
            request_user = self.context['request'].user
            edir = self.instance.edir if self.instance else None

            if not (request_user.is_superuser or (edir and edir.head == request_user)):
                fields['role'].read_only = True

            return fields
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
            'status', 'role'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_active', 
                           'status', ]
        
        
class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'event_type', 'start_date', 'end_date', 
                 'location', 'created_by', 'edir', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_by', 'created_at','edir',]
        
        created_by_name = serializers.CharField(source='created_by.user_name', read_only=True)

class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['id', 'event', 'member', 'member_name', 'status', 'responded_at', 'note']
        read_only_fields = ['id', 'responded_at','event', 'member']

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
        
class TaskGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskGroup
        fields = ['id', 'name', 'description', 'edir', 'event', 'created_by', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_by', 'created_at', 'edir']

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True)
    task_group_name = serializers.CharField(source='task_group.name', read_only=True)

    class Meta:
        model = Task
        fields = ['id', 'task_group', 'task_group_name', 'title', 'description', 
                 'assigned_to', 'assigned_to_name', 'assigned_by', 'assigned_by_name',
                 'due_date', 'priority', 'status', 'created_at', 'completed_at']
        read_only_fields = ['id', 'assigned_by', 'created_at', 'completed_at', 'task_group']

class EventReportSerializer(serializers.ModelSerializer):
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = EventReport
        fields = ['id', 'event', 'event_title', 'prepared_by', 'prepared_by_name',
                 'attendance_summary', 'financial_summary', 'notes',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'event', 'prepared_by']