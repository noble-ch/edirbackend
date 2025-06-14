from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib import messages
from django.db import transaction
from django.utils import timezone
from .models import User, Edir, EdirRequest, Member
from .models import Event, Attendance
from django.contrib.auth import get_user_model
from .models import Resource, ResourceAllocation, ResourceUsage
from .models import EmergencyRequest, MemberFeedback, Memorial
from .models import Payment
from .models import Task, TaskGroup

admin.site.register(Payment)

User = get_user_model()


admin.site.register(User, UserAdmin)

admin.site.register(EmergencyRequest)
admin.site.register(MemberFeedback)
admin.site.register(Memorial)

@admin.register(Edir)
class EdirAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'get_unique_link', 'get_approved_status', 'head')
    readonly_fields = ('unique_link',)
    
    def get_unique_link(self, obj):
        return obj.unique_link
    get_unique_link.short_description = 'Unique Link'
    
    def get_approved_status(self, obj):
        return obj.approved
    get_approved_status.short_description = 'Approved'
    get_approved_status.boolean = True
    
@admin.register(EdirRequest)
class EdirRequestAdmin(admin.ModelAdmin):
    list_display = ('edir_name', 'username', 'email', 'get_status', 'processed')
    list_filter = ('status', 'processed')
    readonly_fields = ('processed',)

    def get_status(self, obj):
        return obj.status
    get_status.short_description = 'Status'

    def save_model(self, request, obj, form, change):

        if change and obj.status == 'approved' and not obj.processed:
            with transaction.atomic():
                # Create user if not exists
                user, created = User.objects.get_or_create(
                    username=obj.username,
                    defaults={
                        'email': obj.email,
                        'password': obj.password  # Latter hashing or generating a temporary password
                    }
                )

                if created:
                    user.set_password(obj.password)
                    user.save()

                # Create Edir
                edir = Edir.objects.create(
                    name=obj.edir_name,
                    description=obj.edir_description,
                    head=user,
                    approved=True
                )

                # Create Member
                Member.objects.create(
                    user=user,
                    edir=edir,
                    full_name=obj.full_name,
                    email=obj.email,
                    phone_number='',
                    address='',
                    city='',
                    state='',
                    zip_code='',
                    registration_type='single',
                    status='approved',
                    is_active=True
                )

                # Mark as processed to avoid duplication
                obj.processed = True
                messages.success(request, f"Edir '{edir.name}' created, and '{user.username}' added as head and member.")

        super().save_model(request, obj, form, change)

@admin.register(TaskGroup)
class TaskGroupAdmin(admin.ModelAdmin):
    list_display = ('id',)

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id',)

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'edir', 'get_status', 'is_active')
    list_filter = ('edir', 'is_active')
    
    def get_status(self, obj):
        return obj.status
    get_status.short_description = 'Status'


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('id',)
 

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id',)
  
@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('id',)
   

@admin.register(ResourceAllocation)
class ResourceAllocationAdmin(admin.ModelAdmin):
    list_display = ('id',)
  
@admin.register(ResourceUsage)
class ResourceUsageAdmin(admin.ModelAdmin):
    list_display = ('id',)
