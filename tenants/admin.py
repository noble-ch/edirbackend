from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib import messages
from django.db import transaction
from django.utils import timezone
from .models import User, Edir, EdirRequest, Member, Role

admin.site.register(User, UserAdmin)

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
        from django.contrib.auth import get_user_model
        User = get_user_model()

        if change and obj.status == 'approved' and not obj.processed:
            with transaction.atomic():
                # Create user if not exists
                user, created = User.objects.get_or_create(
                    username=obj.username,
                    defaults={
                        'email': obj.email,
                        'password': obj.password  # Consider hashing or generating a temporary password
                    }
                )

                # You should hash the password manually if needed
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


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'edir', 'get_status', 'is_active')
    list_filter = ('edir', 'is_active')
    
    def get_status(self, obj):
        return obj.status
    get_status.short_description = 'Status'

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('member', 'role_type', 'is_active')
    list_filter = ('role_type', 'is_active')