from rest_framework.permissions import BasePermission
from django.shortcuts import get_object_or_404
from .models import Member

class IsEdirMember(BasePermission):
    """Allow access only to authenticated members of the Edir."""
    message = 'You must be a member of this Edir to access this resource.'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # For views that use edir_slug in URL
        if hasattr(view, 'get_edir'):
            edir = view.get_edir()
            return Member.objects.filter(user=request.user, edir=edir).exists()
        
        return True  

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        # Get the edir from different object types
        edir = None
        if hasattr(obj, 'edir'):
            edir = obj.edir
        elif hasattr(obj, 'event'):
            edir = obj.event.edir
        elif hasattr(obj, 'resource'):
            edir = obj.resource.edir

        if not edir:
            return False

        return Member.objects.filter(user=request.user, edir=edir).exists()


class IsEdirHead(BasePermission):
    """Allow only edir head to perform actions."""
    message = 'Only the Edir head can perform this action.'

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
            
        # For views that use edir_slug in URL
        if hasattr(view, 'get_edir'):
            edir = view.get_edir()
            return edir.head == request.user if edir.head else False
            
        return True  # Fallback for object-level permissions

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
            
        # Get the edir from different object types
        edir = None
        if hasattr(obj, 'edir'):
            edir = obj.edir
        elif hasattr(obj, 'event'):
            edir = obj.event.edir
        elif hasattr(obj, 'resource'):
            edir = obj.resource.edir

        if not edir or not edir.head:
            return False
            
        return edir.head == request.user


class IsTreasurerOrHead(BasePermission):
    """Allow only treasurer or edir head to perform actions."""
    message = 'You must be the treasurer or Edir head to perform this action.'

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
            
        # For views that use edir_slug in URL
        if hasattr(view, 'get_edir'):
            edir = view.get_edir()
            try:
                member = Member.objects.get(user=request.user, edir=edir)
                return member.role == 'TREASURER' or edir.head == request.user
            except Member.DoesNotExist:
                return False
                
        return True  # Fallback for object-level permissions

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
            
        # Get the edir from different object types
        edir = None
        if hasattr(obj, 'edir'):
            edir = obj.edir
        elif hasattr(obj, 'event'):
            edir = obj.event.edir
        elif hasattr(obj, 'resource'):
            edir = obj.resource.edir

        if not edir:
            return False
            
        try:
            member = Member.objects.get(user=request.user, edir=edir)
            return member.role == 'TREASURER' or edir.head == request.user
        except Member.DoesNotExist:
            return False


class IsPropertyManagerOrHead(BasePermission):
    """Allow only property manager or edir head to perform actions."""
    message = 'You must be the property manager or Edir head to perform this action.'

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
            
        # For views that use edir_slug in URL
        if hasattr(view, 'get_edir'):
            edir = view.get_edir()
            try:
                member = Member.objects.get(user=request.user, edir=edir)
                return member.role == 'PROPERTY_MANAGER' or edir.head == request.user
            except Member.DoesNotExist:
                return False
                
        return True  # Fallback for object-level permissions

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
            
        # Get the edir from different object types
        edir = None
        if hasattr(obj, 'edir'):
            edir = obj.edir
        elif hasattr(obj, 'event'):
            edir = obj.event.edir
        elif hasattr(obj, 'resource'):
            edir = obj.resource.edir

        if not edir:
            return False
            
        try:
            member = Member.objects.get(user=request.user, edir=edir)
            return member.role == 'PROPERTY_MANAGER' or edir.head == request.user
        except Member.DoesNotExist:
            return False


class IsEventCoordinatorOrHead(BasePermission):
    """Allow only event coordinator or edir head to perform actions."""
    message = 'You must be the event coordinator or Edir head to perform this action.'

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
            
        # For views that use edir_slug in URL
        if hasattr(view, 'get_edir'):
            edir = view.get_edir()
            try:
                member = Member.objects.get(user=request.user, edir=edir)
                return member.role == 'COORDINATOR' or edir.head == request.user
            except Member.DoesNotExist:
                return False
                
        return True  # Fallback for object-level permissions

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
            
        # Get the edir from different object types
        edir = None
        if hasattr(obj, 'edir'):
            edir = obj.edir
        elif hasattr(obj, 'event'):
            edir = obj.event.edir
        elif hasattr(obj, 'resource'):
            edir = obj.resource.edir

        if not edir:
            return False
            
        try:
            member = Member.objects.get(user=request.user, edir=edir)
            return member.role == 'COORDINATOR' or edir.head == request.user
        except Member.DoesNotExist:
            return False


class IsResourceManagerOrHead(IsPropertyManagerOrHead):
    """Alias for Property Manager permission (same role)"""
    pass