from rest_framework.permissions import BasePermission
# Import all models that this permission might check against
from .models import Attendance, Member, Role, Event, Contribution, Expense, Edir

class IsEdirHeadOrAdmin(BasePermission):
    """
    Allow access/modification only if the user is a superuser or
    the head of the Edir associated with the object.
    Handles Member, Event, Contribution, Expense, Role objects.
    """
    message = 'You do not have permission to perform this action on this object.' 

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        target_edir = None
        if isinstance(obj, Member):
            target_edir = obj.edir
        elif isinstance(obj, Event):
            target_edir = obj.edir
        elif isinstance(obj, Contribution):
            if obj.event: 
                target_edir = obj.event.edir
        elif isinstance(obj, Expense):
            if obj.event:
                target_edir = obj.event.edir
        elif isinstance(obj, Role):
            if obj.member:
                target_edir = obj.member.edir
        elif isinstance(obj, Edir):
             target_edir = obj

        if not target_edir:
            print(f"Warning: Could not determine target Edir for object type {type(obj)} in IsEdirHeadOrAdmin")
            return False

        if not target_edir.head:
            print(f"Warning: Target Edir {target_edir.id} has no head assigned.")
            return False

        return target_edir.head == request.user



class IsEdirHead(BasePermission):
    """Allow only edir head to perform actions (object-level)."""
    message = 'Only the Edir head can perform this action.'

    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        target_edir = None
        # For Member approval/actions
        if isinstance(obj, Member):
            target_edir = obj.edir
        # For Role assignment/actions
        elif isinstance(obj, Role):
            if obj.member:
                target_edir = obj.member.edir

        if not target_edir or not target_edir.head:
            return False

        return target_edir.head == request.user


class IsEventCreatorOrEdirHead(BasePermission):
    """
    Allows access if user is the object's creator (if applicable)
    OR the head of the object's associated Edir.
    """
    message = 'You must be the creator or the Edir head to modify this.'

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        target_edir = None
        if isinstance(obj, Member): target_edir = obj.edir
        elif isinstance(obj, Event): target_edir = obj.edir
        elif isinstance(obj, Contribution): target_edir = obj.event.edir if obj.event else None
        elif isinstance(obj, Expense): target_edir = obj.event.edir if obj.event else None
        elif isinstance(obj, Role): target_edir = obj.member.edir if obj.member else None
        elif isinstance(obj, Edir): target_edir = obj

        if target_edir and target_edir.head and target_edir.head == request.user:
            return True

        if isinstance(obj, Event):
            return obj.created_by and obj.created_by.user == request.user

        if isinstance(obj, Attendance): 
             return obj.member and obj.member.user == request.user

        if isinstance(obj, Contribution):
            return obj.member and obj.member.user == request.user

        if isinstance(obj, Expense):
            return obj.spent_by and obj.spent_by.user == request.user

        return False
    

class IsCoordinatorOrEdirHead(BasePermission):
    """Check if user is Edir head or has Coordinator role"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser:
            return True
            
        try:
            member = Member.objects.get(user=request.user)
            return (member.edir.head == request.user or 
                    member.roles.filter(role_type='COORDINATOR', is_active=True).exists())
        except Member.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'edir'):
            edir = obj.edir
        elif hasattr(obj, 'task_group'):
            edir = obj.task_group.edir
        elif hasattr(obj, 'event'):
            edir = obj.event.edir
        else:
            return False
            
        try:
            member = Member.objects.get(user=request.user)
            return (edir.head == request.user or 
                    (member.roles.filter(role_type='COORDINATOR', is_active=True).exists() and
                     member.edir == edir))
        except Member.DoesNotExist:
            return False