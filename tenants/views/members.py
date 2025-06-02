from rest_framework import viewsets, mixins, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema

from ..permissions import IsEdirHead
from ..serializers import MemberSerializer, MemberDetailSerializer
from ..models import Member
from django.core.mail import send_mail


class MemberViewSet(mixins.RetrieveModelMixin,
                   mixins.UpdateModelMixin,
                   mixins.DestroyModelMixin,
                   mixins.ListModelMixin,
                   viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsEdirHead]
    queryset = Member.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        return MemberSerializer
        
    def get_queryset(self):
        user = self.request.user
        queryset = Member.objects.all()
        
        # Apply status filter if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        try:
            current_member = Member.objects.get(user=user)
            # For edir heads, only show members from their edir
            if current_member.role == 'head':
                return queryset.filter(edir=current_member.edir)
            # For other roles (like admin), show members from their edir
            elif current_member.role != 'regular_member':
                return queryset.filter(edir=current_member.edir).exclude(role='regular_member')
            # Regular members can only see themselves
            else:
                return queryset.filter(user=user)
        except Member.DoesNotExist:
            return queryset.none()
    
    @swagger_auto_schema(
        operation_description="Get details of a specific member",
        responses={200: MemberDetailSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Update a member",
        request_body=MemberSerializer,
        responses={200: MemberSerializer}
    )
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        member = self.get_object()
        print(request.data)
        trimmed_data = str(request.data)[1:-1]
        send_mail(
            subject='Member Updated',
            message=f'Hello {member.user.get_full_name()} has been updated. {trimmed_data}',
            from_email='no-reply@example.com',
            recipient_list=[member.user.email],
            fail_silently=True,
        )
        return response

    
    @swagger_auto_schema(
        operation_description="Partial update of a member",
        request_body=MemberSerializer,
        responses={200: MemberSerializer}
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