from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from ..models import EmergencyRequest, MemberFeedback, Memorial,Edir,Member
from ..serializers import EmergencyRequestSerializer, MemberFeedbackSerializer, MemorialSerializer

from rest_framework.decorators import action


class EmergencyRequestViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_edir(self):
        edir_slug = self.request.queryno_params.get('edir_slug')
        if not edir_slug:
            return None
        try:
            return Edir.objects.get(slug=edir_slug)
        except Edir.DoesNotExist:
            return None

    def get_queryset(self):
        edir = self.get_edir()
        if edir:
            return EmergencyRequest.objects.filter(edir=edir)
        user = self.request.user
        if user.is_superuser:
            return EmergencyRequest.objects.all()
        member = Member.objects.get(user=user)
        return EmergencyRequest.objects.filter(edir=member.edir)
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return EmergencyRequest.objects.all()
        member = Member.objects.get(user=user)
        return EmergencyRequest.objects.filter(edir=member.edir)
    
    @action(detail=False, methods=['POST'])
    def perform_create(self, serializer):
        member = Member.objects.get(user=self.request.user)
        serializer.save(member=member, edir=member.edir)

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