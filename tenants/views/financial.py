from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..permissions import IsEdirHead
from ..serializers import ContributionSerializer, ExpenseSerializer
from ..models import Contribution, Expense, Member, Event
from tenants import serializers

class ContributionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ContributionSerializer

    def get_queryset(self):
        user = self.request.user
        event_id = self.kwargs.get('event_id')

        base_queryset = Contribution.objects.all()

        if event_id:
            base_queryset = base_queryset.filter(event_id=event_id)
            
        if user.is_superuser:
            return base_queryset

        try:
            member = Member.objects.get(user=user) 
            edir = member.edir

            if edir.head == user:
                return base_queryset.filter(event__edir=edir)

            return base_queryset.filter(member=member)

        except Member.DoesNotExist:
             return Contribution.objects.none()

    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_id')
        if not event_id:
             raise serializers.ValidationError("Event ID must be provided in the URL.")

        event = get_object_or_404(Event, id=event_id)
        member = get_object_or_404(Member, user=self.request.user, edir=event.edir)

        serializer.save(event=event, member=member)

    @action(detail=True, methods=['post'], permission_classes=[IsEdirHead])
    def confirm(self, request, pk=None, **kwargs): 
        contribution = self.get_object()
        try:
            requesting_member = get_object_or_404(Member, user=request.user)
        except Member.DoesNotExist:
             return Response({"error": "Requesting user is not a registered member."}, status=status.HTTP_403_FORBIDDEN)

        if contribution.event.edir != requesting_member.edir:
            return Response(
                {"error": "You can only confirm contributions in your Edir"},
                status=status.HTTP_403_FORBIDDEN
            )

        contribution.confirmed_by = requesting_member
        contribution.confirmed_at = timezone.now()
        contribution.save()

        serializer = self.get_serializer(contribution)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        user = self.request.user
        event_id = self.kwargs.get('event_id')

        base_queryset = Expense.objects.all()

        if event_id:
            base_queryset = base_queryset.filter(event_id=event_id)

        if user.is_superuser:
            return base_queryset

        try:
            member = Member.objects.get(user=user)
            edir = member.edir

            if edir.head == user:
                return base_queryset.filter(event__edir=edir)

            return base_queryset.filter(spent_by=member)

        except Member.DoesNotExist:
            return Expense.objects.none()

    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_id')
        if not event_id:
             raise serializers.ValidationError("Event ID must be provided in the URL.")

        event = get_object_or_404(Event, id=event_id)
        member = get_object_or_404(Member, user=self.request.user, edir=event.edir)

        serializer.save(event=event, spent_by=member)

    @action(detail=True, methods=['post'], permission_classes=[IsEdirHead])
    def approve(self, request, pk=None, **kwargs):
        expense = self.get_object()
        try:
            requesting_member = get_object_or_404(Member, user=request.user)
        except Member.DoesNotExist:
             return Response({"error": "Requesting user is not a registered member."}, status=status.HTTP_403_FORBIDDEN)

        if expense.event.edir != requesting_member.edir:
            return Response(
                {"error": "You can only approve expenses in your Edir"},
                status=status.HTTP_403_FORBIDDEN
            )

        expense.approved_by = requesting_member
        expense.approved_at = timezone.now()
        expense.save()

        serializer = self.get_serializer(expense)
        return Response(serializer.data, status=status.HTTP_200_OK)