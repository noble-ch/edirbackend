from rest_framework import viewsets, mixins, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from django.shortcuts import get_object_or_404

# Assuming User is correctly imported (e.g., from django.contrib.auth.models or a custom path)
# from django.contrib.auth import get_user_model
# User = get_user_model()
# The original code had: from tenants.serializers.member_serializers import User
# This implies User might be a custom model or re-exported. Using it as is.
from tenants.serializers.member_serializers import MemberUpdateSerializer, User


from ..permissions import IsEdirHead
from ..serializers import MemberSerializer, MemberDetailSerializer
from ..models import Member


from rest_framework.decorators import action
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings


class MemberViewSet(mixins.RetrieveModelMixin,
                   mixins.UpdateModelMixin,
                   mixins.DestroyModelMixin,
                   mixins.ListModelMixin,
                   viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsEdirHead] # Default, can be overridden by get_permissions
    queryset = Member.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        if self.action in ['update', 'partial_update']:
            return MemberUpdateSerializer
        return MemberSerializer
        
    def get_queryset(self):
        user = self.request.user
        queryset = Member.objects.select_related('user', 'edir').all() # Added select_related for efficiency
        
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        try:
            # Use prefetch_related user if available from IsAuthenticated or get it fresh
            # Make sure request.user is the actual User model instance
            if not user or not user.is_authenticated: # Should be caught by IsAuthenticated permission
                return queryset.none()

            current_member = Member.objects.get(user=user)
            if current_member.role == 'head':
                return queryset.filter(edir=current_member.edir)
            elif current_member.role != 'regular_member': # e.g. admin, secretary for their edir
                return queryset.filter(edir=current_member.edir).exclude(role='regular_member')
            else: # Regular members can only see themselves
                return queryset.filter(pk=current_member.pk) # More direct
        except Member.DoesNotExist:
            # If the requesting user is not a member, what should they see?
            # IsEdirHead permission might already handle this.
            # If user is superuser but not a member, they might see all if not for this logic.
            # Depending on IsEdirHead, this might be fine or need adjustment for superusers.
            # For now, if not a member, they see nothing from this queryset filtering.
            return queryset.none()
        
    @swagger_auto_schema(
        operation_description="Update a member",
        request_body=MemberUpdateSerializer, # Corrected
        responses={200: MemberUpdateSerializer} # Corrected
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        current_member = get_object_or_404(Member, user=request.user)
        
        # Check if user is updating themselves or has permission (as head or admin of the edir)
        # Admin check: current_member.is_admin assumes an 'is_admin' field or property on Member model.
        # If 'is_admin' refers to User.is_staff or User.is_superuser, that check should be:
        # request.user.is_staff or request.user.is_superuser
        # Assuming current_member.is_admin is a field on the Member model related to Edir administration.
        can_update = (instance.user == request.user or 
                      current_member.role == 'head' or 
                      getattr(current_member, 'is_admin', False)) # Added getattr for safety

        # Additional check: head can only update members of their own edir.
        if current_member.role == 'head' and instance.edir != current_member.edir:
            can_update = False

        if not can_update:
            return Response(
                {"detail": "You don't have permission to update this member."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_status = instance.status
        old_role = instance.role
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Store which fields were initially in validated_data, before perform_update might modify it
        initial_validated_fields = set(serializer.validated_data.keys())
        
        self.perform_update(serializer) # This calls serializer.save() internally
        
        # Standard DRF practice: Invalidate prefetch cache if used
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        updated_instance = serializer.instance # Instance is updated after serializer.save()
        new_status = updated_instance.status
        new_role = updated_instance.role

        status_update_attempted = 'status' in initial_validated_fields
        role_update_attempted = 'role' in initial_validated_fields

        status_actually_changed = old_status != new_status
        role_actually_changed = old_role != new_role
        
        send_email_notification = False
        email_subject_parts = []
        # Use updated_instance for user details as instance might be stale for related fields if they were part of update
        email_body_lines = [f"Hello {updated_instance.user.get_full_name() or updated_instance.user.username},"]
        
        if status_update_attempted and status_actually_changed:
            email_subject_parts.append("Status")
            email_body_lines.append(f"Your membership status has changed to: {new_status}.")
            send_email_notification = True
            print(f"DEBUG: Member {updated_instance.user.username} status changed from '{old_status}' to '{new_status}'.")

        if role_update_attempted and role_actually_changed:
            email_subject_parts.append("Role")
            email_body_lines.append(f"Your membership role has changed to: {new_role}.")
            send_email_notification = True
            print(f"DEBUG: Member {updated_instance.user.username} role changed from '{old_role}' to '{new_role}'.")

        if send_email_notification:
            if not email_subject_parts: # Should not happen if send_email_notification is True
                final_subject = "Your Membership Details Updated"
            elif len(email_subject_parts) == 1:
                final_subject = f"Your Membership {email_subject_parts[0]} Changed"
            else:
                final_subject = f"Your Membership { ' and '.join(email_subject_parts) } Changed"
            
            # Add a generic line if there are specific changes listed
            if len(email_body_lines) > 1: # More than just "Hello User,"
                 greeting = email_body_lines.pop(0) # Get the greeting
                 email_body_lines.insert(0, "Some of your membership details have been updated:")
                 email_body_lines.insert(0, greeting) # Put greeting back at the top

            final_body = "\n\n".join(email_body_lines) # Use double newline for paragraph separation

            try:
                send_mail(
                    final_subject,
                    final_body,
                    settings.DEFAULT_FROM_EMAIL,
                    [updated_instance.user.email],
                    fail_silently=False, # Set to True in production, but log errors
                )
                print(f"INFO: Update notification email sent to {updated_instance.user.email}")
            except Exception as e:
                print(f"ERROR: Failed to send update notification email to {updated_instance.user.email}: {e}")
                # Log this error properly in a production environment
        
        return Response(serializer.data)

    def perform_update(self, serializer):
        # current_member is the one performing the action
        current_member = get_object_or_404(Member, user=self.request.user)

        if current_member.role != 'head':
            if 'role' in serializer.validated_data:
                del serializer.validated_data['role']
            if 'status' in serializer.validated_data:
                del serializer.validated_data['status']
        
        serializer.save()
        
    def get_permissions(self):
        if self.action in ['request_password_reset', 'reset_password']:
            return []  

        return super().get_permissions()
       
    @action(detail=False, methods=['post'], url_path='request-password-reset')
    def request_password_reset(self, request, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"email": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email) 

            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/" 
            
            try:
                send_mail(
                    'Password Reset Request',
                    f'Click this link to reset your password: {reset_url}',
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
                return Response({"detail": "Password reset email sent."}, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"ERROR: Failed to send password reset email to {user.email}: {e}")
                # Log this error
                return Response({"detail": "Could not send password reset email. Please try again later or contact support."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except User.DoesNotExist: # Removed Member.DoesNotExist unless explicitly required
            return Response({"detail": "User with this email does not exist or is not a registered member."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='reset-password')
    def reset_password(self, request):
        uidb64 = request.data.get('uid') 
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([uidb64, token, new_password]):
            return Response({"detail": "UID, token and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
            
            if not default_token_generator.check_token(user, token):
                return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(new_password)
            user.save()
            
            return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        except (User.DoesNotExist, UnicodeDecodeError, ValueError, OverflowError): 
            return Response({"detail": "Invalid user or token structure."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='change-password') 
    def change_password(self, request, pk=None):

        target_member_being_changed = self.get_object() 


        if target_member_being_changed.user != request.user:
            return Response(
                {"detail": "You can only change your own password."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_to_change_password_for = request.user # or target_member_being_changed.user
        
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not all([old_password, new_password]):
            return Response({"detail": "Both old and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not user_to_change_password_for.check_password(old_password):
            return Response({"detail": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add password validation for new_password if needed
        user_to_change_password_for.set_password(new_password)
        user_to_change_password_for.save()
        
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)
        
    @swagger_auto_schema(
        operation_description="Get details of a specific member",
        responses={200: MemberDetailSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    

    @swagger_auto_schema(
        operation_description="Partial update of a member",
        request_body=MemberUpdateSerializer, 
        responses={200: MemberUpdateSerializer} 
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs) 
    
    @swagger_auto_schema(
        operation_description="Delete a member",
        responses={204: "No content"}
    )
    def destroy(self, request, *args, **kwargs):

        return super().destroy(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="List all members of the edir",
        responses={200: MemberSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)