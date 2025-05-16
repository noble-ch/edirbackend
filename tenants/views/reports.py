from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..permissions import IsEventCoordinatorOrHead
from ..serializers import EventReportSerializer
from ..models import EventReport, Event, Member

class EventReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsEventCoordinatorOrHead]
    serializer_class = EventReportSerializer

    def get_queryset(self):
        user = self.request.user
        event_id = self.kwargs.get('event_id')

        queryset = EventReport.objects.all()
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        if user.is_superuser:
            return queryset
        
        return queryset.filter(event__edir__members__user=user)

    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_id')
        event = get_object_or_404(Event, id=event_id)
        member = get_object_or_404(Member, user=self.request.user, edir=event.edir)
        
        attendance_summary = {
            'total_members': event.edir.members.count(),
            'attending': event.attendances.filter(status='attending').count(),
            'not_attending': event.attendances.filter(status='not_attending').count(),
            'maybe': event.attendances.filter(status='maybe').count(),
            'no_response': event.edir.members.count() - event.attendances.count()
        }
        
        financial_summary = {
            'total_contributions': sum(c.amount for c in event.contributions.all()),
            'total_expenses': sum(e.amount for e in event.expenses.all()),
            'balance': sum(c.amount for c in event.contributions.all()) - sum(e.amount for e in event.expenses.all()),
            'contribution_count': event.contributions.count(),
            'expense_count': event.expenses.count()
        }
        
        serializer.save(
            event=event,
            prepared_by=member,
            attendance_summary=attendance_summary,
            financial_summary=financial_summary
        )

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, event_id=None, pk=None):
        return Response({'message': 'PDF generation endpoint'})