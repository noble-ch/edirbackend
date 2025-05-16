from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from rest_framework import viewsets
from ..serializers import UserLoginSerializer, MemberSerializer
from ..models import Edir, Member

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
            
            if response_data.get('verification_status') in ['PENDING', 'REJECTED']:
                status_code = status.HTTP_403_FORBIDDEN
            
            return Response(response_data, status=status_code)
        
        return Response(
            {'error': 'Login failed', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

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
        pass