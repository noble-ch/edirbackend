from rest_framework import viewsets, status
from rest_framework.response import Response
from ..models import EdirRequest,Edir,Member
from ..serializers import EdirRequestSerializer, EdirRequestApprovalSerializer
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from django.db import transaction

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings

User = get_user_model()

class EdirRequestViewSet(viewsets.ModelViewSet):

    queryset = EdirRequest.objects.all()
    serializer_class = EdirRequestSerializer
    http_method_names = ['get', 'post','patch']


    @swagger_auto_schema(
        operation_description="Create a new Edir request",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['full_name', 'username', 'email', 'password', 'edir_name', 'edir_description'],
            properties={
                'full_name': openapi.Schema(type=openapi.TYPE_STRING),
                'username': openapi.Schema(type=openapi.TYPE_STRING),
                'email': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_EMAIL),
                'password': openapi.Schema(type=openapi.TYPE_STRING, writeOnly=True),
                'edir_name': openapi.Schema(type=openapi.TYPE_STRING),
                'edir_description': openapi.Schema(type=openapi.TYPE_STRING),
                'proposed_cbe_account': openapi.Schema(type=openapi.TYPE_STRING, pattern='^\d{13}$'),
                'proposed_account_holder': openapi.Schema(type=openapi.TYPE_STRING),
                'proposed_address': openapi.Schema(type=openapi.TYPE_STRING),
                'proposed_initial_deposit': openapi.Schema(type=openapi.TYPE_NUMBER),
            },
        ),
        responses={
            201: openapi.Response('Created', EdirRequestSerializer),
            400: 'Bad Request'
        }
    )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
        
    def list(self, request, *args, **kwargs):
        self.permission_classes = [IsAdminUser]
        self.check_permissions(request)
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


    @action(detail=True, methods=['PATCH'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Admin endpoint to approve/reject an Edir request"""

        edir_request = self.get_object()
        serializer = EdirRequestApprovalSerializer(
            edir_request, 
            data=request.data, 
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        if edir_request.processed:
            return Response(
                {'error': 'This request has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        status_value = serializer.validated_data.get('status')
        
        if status_value == 'approved':
            try:
                with transaction.atomic():
                    # Create user
                    user = User.objects.create_user(
                        username=edir_request.username,
                        email=edir_request.email,
                        password=edir_request.password
                    )

                    # Create Edir with all fields
                    edir = Edir.objects.create(
                        name=edir_request.edir_name,
                        description=edir_request.edir_description,
                        head=user,
                        approved=True,
                        cbe_account_number=edir_request.proposed_cbe_account,
                        account_holder_name=edir_request.proposed_account_holder,
                        address=edir_request.proposed_address,
                        initial_deposit=edir_request.proposed_initial_deposit,
                        current_balance=edir_request.proposed_initial_deposit
                    )

                    # Create Member
                    Member.objects.create(
                        user=user,
                        edir=edir,
                        full_name=edir_request.full_name,
                        email=edir_request.email,
                        status='approved',
                        is_active=True
                    )

                    # Mark request as processed
                    edir_request.status = 'approved'
                    edir_request.processed = True
                    edir_request.save()

                    # Send email with edir slug and unique link
                    edir_slug = getattr(edir, 'slug', None)
                    if not edir_slug and hasattr(edir, 'get_slug'):
                        edir_slug = edir.get_slug()
                    # Fallback if slug is not available
                    edir_slug = edir_slug or str(edir.id)
                    # Build unique link (adjust 'edir-detail' to your url name)
                    link = edir.unique_link
                    subject = f"Edir '{edir.name}' Approved"
                    message = (
                        f"Congratulations! Your Edir '{edir.name}' has been approved.\n"
                        f"Your edir: {edir_slug}\n"
                        f"Access your Edir here: http://localhost:5173/{edir_slug}/"
                    )
                    send_mail(
                        subject,
                        message,
                        getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                        [edir_request.email],
                        fail_silently=True,
                    )

                    return Response(
                        {
                            'message': f"Edir '{edir.name}' created successfully",
                            'edir_id': edir.id,
                            'user_id': user.id
                        },
                        status=status.HTTP_200_OK
                    )

            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        else:
            edir_request.status = 'rejected'
            edir_request.processed = True
            edir_request.save()
            return Response(
                {'message': 'Edir request rejected'},
                status=status.HTTP_200_OK
            )