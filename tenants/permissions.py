from rest_framework.permissions import BasePermission

class IsEdirHeadOrAdmin(BasePermission):
    """Allow only edir heads or admins to access member data"""
    
    def has_object_permission(self, request, view, obj):
        # Allow admins
        if request.user.is_superuser:
            return True
        
        # Allow the edir head
        return obj.edir.head == request.user