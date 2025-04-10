from django.shortcuts import render, redirect,  get_object_or_404
from django.shortcuts import redirect
from rest_framework.generics import RetrieveAPIView
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status, mixins
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework import status
from rest_framework import mixins





from .permissions import IsEdirHeadOrAdmin
from .serializers import EdirSerializer, MemberApprovalSerializer, MemberSerializer, MemberDetailSerializer, RoleAssignmentSerializer, UserLoginSerializer
from .forms import EdirRequestForm
from .models import Edir, Member, Role




class EdirRequestAPIView(APIView):
    renderer_classes = [TemplateHTMLRenderer]
    template_name = 'tenants/edir_request.html'

    @swagger_auto_schema(
        operation_description="Submit a request to create a new Edir",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'name': openapi.Schema(type=openapi.TYPE_STRING, description='Name of the Edir'),
                'description': openapi.Schema(type=openapi.TYPE_STRING, description='Description of the Edir'),
                'location': openapi.Schema(type=openapi.TYPE_STRING, description='Location of the Edir'),
            },
            required=['name', 'description', 'location'],  # Adjust based on your form
        ),
        responses={
            200: openapi.Response(
                description="Edir request submitted successfully",
                examples={
                    "text/html": "<html><body>Edir request success</body></html>"
                }
            )
        }
    )
    def post(self, request, *args, **kwargs):
        form = EdirRequestForm(request.data)
        if form.is_valid():
            form.save()
            return Response(template_name='tenants/edir_request_success.html')
        return Response({'form': form}, template_name='tenants/edir_request.html')

    def get(self, request, *args, **kwargs):
        form = EdirRequestForm()
        return Response({'form': form})


class EdirDashboardView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Edir.objects.all()
    serializer_class = EdirSerializer
    lookup_field = 'slug'
    
def edir_unique_link_redirect(request, edir_slug):  
    edir = get_object_or_404(Edir, slug=edir_slug)
    return redirect('edir_dashboard', edir_slug=edir.slug)


class UserLoginAPIView(APIView):
    def post(self, request, edir_slug=None):
        serializer = UserLoginSerializer(
            data=request.data,
            context={
                'request': request,
                'edir_slug': edir_slug
            }
        )
        
        if serializer.is_valid():
            response_data = serializer.validated_data
            status_code = status.HTTP_200_OK
            
            # Adjust response for pending/rejected members
            verification_status = response_data.get('verification_status')
            if verification_status in [
                'PENDING',
                'REJECTED'
            ]:
                status_code = status.HTTP_403_FORBIDDEN
            
            return Response(response_data, status=status_code)
        
        return Response(
            {
                'error': 'Login failed',
                'details': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
        
    
class MemberApprovalViewSet(
    mixins.UpdateModelMixin,
    GenericViewSet
):
    permission_classes = [IsAuthenticated]
    queryset = Member.objects.all()
    serializer_class = MemberApprovalSerializer
    lookup_field = 'id'

    def get_queryset(self):
        # Only show members from the user's edir
        user = self.request.user
        if user.is_superuser:
            return Member.objects.all()
        return Member.objects.filter(edir__head=user)
    

class RoleAssignmentViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    GenericViewSet
):
    permission_classes = [IsAuthenticated]
    queryset = Role.objects.all()
    serializer_class = RoleAssignmentSerializer

    def get_queryset(self):
        # Only show roles from the user's edir
        user = self.request.user
        if user.is_superuser:
            return Role.objects.all()
        return Role.objects.filter(member__edir__head=user)
    
class MemberRegistrationViewSet(viewsets.ViewSet):
    throttle_classes = [AnonRateThrottle]
    
    def create(self, request, edir_slug=None):
        try:
            edir = Edir.objects.get(slug=edir_slug, approved=True)
        except Edir.DoesNotExist:
            return Response(
                {"error": "Edir not found or not approved"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        data = request.data.copy()
        data['edir'] = edir.id
        
        serializer = MemberSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            member = serializer.save()
            
            # Send verification email
            self._send_verification_email(member)
            
            response_data = serializer.data
            response_data['id'] = member.id
            return Response(
                {"message": "Registration successful. Please check your email for verification."},
                status=status.HTTP_201_CREATED
            )
        return Response(
            {"errors": serializer.errors}, 
            status=status.HTTP_400_BAD_REQUEST,
            content_type="application/json"
        )

    def _send_verification_email(self, member):
        # Implement email sending logic here
        pass

class MemberViewSet(mixins.RetrieveModelMixin,
                   mixins.UpdateModelMixin,
                   mixins.DestroyModelMixin,
                   mixins.ListModelMixin,
                   viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsEdirHeadOrAdmin]
    queryset = Member.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        return MemberSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Member.objects.all()
        
        # For filtering by status if needed
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        if user.is_superuser:
            return queryset
        return queryset.filter(edir__head=user)
    
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
        return super().update(request, *args, **kwargs)
    
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
        operation_description="List all members",
        responses={200: MemberSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)