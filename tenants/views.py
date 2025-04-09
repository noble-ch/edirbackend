from django.shortcuts import render, redirect,  get_object_or_404
from django.shortcuts import redirect
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status, mixins
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from .permissions import IsEdirHeadOrAdmin
from .serializers import EdirSerializer, MemberSerializer, MemberDetailSerializer
from .forms import EdirRequestForm
from .models import Edir, Member




def edir_request_view(request):
    if request.method == 'POST':
        form = EdirRequestForm(request.POST)
        if form.is_valid():
            form.save()
            return render(request, 'tenants/edir_request_success.html')
    else:
        form = EdirRequestForm()
    return render(request, 'tenants/edir_request.html', {'form': form})



class EdirDashboardView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Edir.objects.all()
    serializer_class = EdirSerializer
    lookup_field = 'slug'
    
def edir_unique_link_redirect(request, edir_slug):  
    edir = get_object_or_404(Edir, slug=edir_slug)
    return redirect('edir_dashboard', edir_slug=edir.slug)


class MemberRegistrationViewSet(viewsets.ViewSet):
    def create(self, request, edir_slug=None):
        try:
            edir = Edir.objects.get(slug=edir_slug)
        except Edir.DoesNotExist:
            return Response({"error": "Edir not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['edir'] = edir.id  # Set the edir ID
        
        serializer = MemberSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            member = serializer.save()
            # Include the auto-generated ID in the response
            response_data = serializer.data
            response_data['id'] = member.id
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        # Only show members that belong to the user's edirs
        user = self.request.user
        if user.is_superuser:
            return Member.objects.all()
        return Member.objects.filter(edir__head=user)
    
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