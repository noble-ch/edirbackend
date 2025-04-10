from rest_framework.permissions import BasePermission

from .models import Member, Role

class IsEdirHeadOrAdmin(BasePermission):
    """Allow only edir heads or admins to access member data"""
    
    def has_object_permission(self, request, view, obj):
        # Allow admins
        if request.user.is_superuser:
            return True
        
        # Allow the edir head
        return obj.edir.head == request.user
    
class IsEdirHead(BasePermission):
    """Allow only edir head to perform actions"""
    
    def has_permission(self, request, view):
        # For object-level permissions only
        return True
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        # For Member approval
        if isinstance(obj, Member):
            return obj.edir.head == request.user
        
        # For Role assignment
        if isinstance(obj, Role):
            return obj.member.edir.head == request.user
        
        return False