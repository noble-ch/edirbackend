from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from ..models import EmergencyRequest, MemberFeedback, Memorial,Edir,Member
from ..serializers import EmergencyRequestSerializer, MemberFeedbackSerializer, MemorialSerializer

from rest_framework.decorators import action
from django.utils import timezone



class EmergencyRequestViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        edir_slug = self.kwargs.get('edir_slug')
        
        if not edir_slug:
            return EmergencyRequest.objects.none()
            
        try:
            edir = Edir.objects.get(slug=edir_slug)
            if user.is_superuser:
                return EmergencyRequest.objects.filter(edir=edir)
            
            member = Member.objects.get(user=user, edir=edir)
            return EmergencyRequest.objects.filter(edir=edir)
        except (Edir.DoesNotExist, Member.DoesNotExist):
            return EmergencyRequest.objects.none()

    def perform_create(self, serializer):
        edir_slug = self.kwargs.get('edir_slug')
        if not edir_slug:
            raise serializers.ValidationError("Edir slug is required")
            
        edir = Edir.objects.get(slug=edir_slug)
        member = Member.objects.get(user=self.request.user, edir=edir)
        serializer.save(member=member, edir=edir)

    @action(detail=True, methods=['patch'], url_path='approve')
    def approve(self, request, edir_slug=None, pk=None):
        try:
            # Get the emergency request
            emergency = self.get_object()
            
            # Get the edir and member
            edir = Edir.objects.get(slug=edir_slug)
            member = Member.objects.get(user=request.user, edir=edir)
            
            # Check permissions
            if not (request.user.is_superuser or member.is_admin):
                return Response(
                    {"detail": "You do not have permission to approve requests."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validate input
            approved_amount = request.data.get('approved_amount')
            response_note = request.data.get('response_note', '')
            
            if not approved_amount:
                return Response(
                    {"approved_amount": ["This field is required."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                approved_amount = float(approved_amount)
            except (TypeError, ValueError):
                return Response(
                    {"approved_amount": ["Must be a valid number."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the emergency request
            emergency.approved_amount = approved_amount
            emergency.response_note = response_note
            emergency.status = 'approved'
            emergency.reviewed_by = member
            emergency.reviewed_at = timezone.now()
            emergency.save()
            
            serializer = self.get_serializer(emergency)
            return Response(serializer.data)
            
        except Edir.DoesNotExist:
            return Response(
                {"detail": "Edir not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Member.DoesNotExist:
            return Response(
                {"detail": "Member not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class MemberFeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = MemberFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return MemberFeedback.objects.all()
        member = Member.objects.get(user=user)
        return MemberFeedback.objects.filter(edir=member.edir)

    def perform_create(self, serializer):
        member = Member.objects.get(user=self.request.user)
        serializer.save(member=member, edir=member.edir)

class MemorialViewSet(viewsets.ModelViewSet):
    serializer_class = MemorialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Memorial.objects.all()
        member = Member.objects.get(user=user)
        return Memorial.objects.filter(edir=member.edir)

    def perform_create(self, serializer):
        member = Member.objects.get(user=self.request.user)
        serializer.save(edir=member.edir, created_by=member)