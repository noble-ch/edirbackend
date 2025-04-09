from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Edir, EdirRequest, Member

from django.conf import settings

admin.site.register(User, UserAdmin)
admin.site.register(Member)


@admin.register(Edir)
class EdirAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'unique_link', 'approved', 'head')
    readonly_fields = ('unique_link',)
    
@admin.register(EdirRequest)
class EdirRequestAdmin(admin.ModelAdmin):
    list_display = ('edir_name', 'username', 'email', 'status', 'processed')
    list_filter = ('status',)

    def save_model(self, request, obj, form, change):
        if obj.status == 'approved' and not obj.processed:
            try:
                # Check if user already exists
                if User.objects.filter(username=obj.username).exists():
                    user = User.objects.get(username=obj.username)
                    # Update user details
                    user.email = obj.email
                    name_parts = obj.full_name.split()
                    user.first_name = name_parts[0] if name_parts else ''
                    user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
                    user.set_password(obj.password)
                    user.save()
                else:
                    # Create new user
                    user = User.objects.create_user(
                        username=obj.username,
                        email=obj.email,
                        password=obj.password,
                        first_name=obj.full_name.split()[0],
                        last_name=' '.join(obj.full_name.split()[1:]),
                    )

                # Create the Edir
                edir = Edir.objects.create(
                    name=obj.edir_name,
                    description=obj.edir_description,
                    approved=True,
                    head=user
                )
                # No need to call save() separately as create() already saves

                obj.processed = True
                obj.save()

            except Exception as e:
                # Handle any errors during creation
                obj.status = 'rejected'
                obj.processed = True
                obj.save()
                from django.contrib import messages
                messages.error(request, f"Error processing EdirRequest: {str(e)}")

        elif obj.status == 'rejected' and not obj.processed:
            obj.processed = True
            obj.save()

        super().save_model(request, obj, form, change)
        

