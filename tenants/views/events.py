from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from django.shortcuts import get_object_or_404
from django.db.models import Q

from ..serializers import EventSerializer, AttendanceSerializer
from ..models import Event, Attendance, Member,Edir

class EventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EventSerializer
    
    def get_queryset(self):
        user = self.request.user
        edir_slug = self.kwargs.get('edir_slug')
        
        if edir_slug:
            return Event.objects.filter(edir__slug=edir_slug)
        
        if user.is_superuser:
            return Event.objects.all()
        
        return Event.objects.filter(edir__members__user=user)
    
    def perform_create(self, serializer):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        member = get_object_or_404(Member, user=self.request.user, edir=edir)
        serializer.save(edir=edir, created_by=member)
    
    @swagger_auto_schema(
        operation_description="Retrieve details of a specific event",
        responses={200: EventSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Update an event",
        request_body=EventSerializer,
        responses={200: EventSerializer}
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Partial update of an event",
        request_body=EventSerializer,
        responses={200: EventSerializer}
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Delete an event",
        responses={204: "No content"}
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class AttendanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceSerializer
    
    def get_queryset(self):
        user = self.request.user
        event_id = self.kwargs.get('event_id')
        
        if user.is_superuser:
            return Attendance.objects.all()
        
        return Attendance.objects.filter(
            Q(member__user=user) | 
            Q(event__edir__members__user=user)
        ).distinct()
    
    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_id')
        event = get_object_or_404(Event, id=event_id)
        member = get_object_or_404(Member, user=self.request.user, edir=event.edir)
        serializer.save(event=event, member=member)