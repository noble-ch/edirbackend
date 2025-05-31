from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from datetime import datetime
import logging
import requests
from twilio.rest import Client

from ..permissions import IsEdirMember
from ..serializers import ReminderSerializer
from ..models import Member, Payment, Reminder, Edir

logger = logging.getLogger(__name__)
User = get_user_model()


class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    permission_classes = [IsEdirMember]

    def get_queryset(self):
        """Return reminders where user is creator or recipient, filtered by edir if specified"""
        user = self.request.user
        edir_slug = self.kwargs.get('edir_slug')
        queryset = super().get_queryset()

        # Get member instance for the current user
        member_filter = {'user': user}
        if edir_slug:
            member_filter['edir__slug'] = edir_slug
        
        member = Member.objects.filter(**member_filter).first()
        if not member:
            return queryset.none()

        # Base queryset filtering
        queryset = queryset.filter(
            models.Q(created_by=user) 
            # models.Q(recipients=member)
        ).distinct()

        # Additional edir filtering if slug provided
        if edir_slug:
            queryset = queryset.filter(edir__slug=edir_slug)

        # Optional query parameter filtering
        if self.request.query_params.get('is_creator', '').lower() == 'true':
            queryset = queryset.filter(created_by=user)
        elif self.request.query_params.get('is_recipient', '').lower() == 'true':
            queryset = queryset.filter(recipients=member)

        return queryset

    def perform_create(self, serializer):
        """Set edir from URL and created_by from request user"""
        edir = get_object_or_404(Edir, slug=self.kwargs.get('edir_slug'))
        serializer.save(edir=edir, created_by=self.request.user)

    def _send_sms(self, reminder):
        """Send SMS via Twilio to all recipients with phone numbers"""
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            for recipient in reminder.recipients.exclude(phone_number__isnull=True):
                client.messages.create(
                    body=reminder.message,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=recipient.phone_number
                )
                logger.info(f"SMS sent to {recipient.phone_number}")
            return True
        except Exception as e:
            logger.error(f"SMS send failed: {str(e)}")
            return False

    def _send_email(self, reminder):
        """Send email to all recipients with email addresses"""
        try:
            recipients = list(reminder.recipients.exclude(email__isnull=True)
                                      .values_list('email', flat=True))
            if recipients:
                send_mail(
                    reminder.subject,
                    reminder.message,
                    settings.DEFAULT_FROM_EMAIL,
                    recipients,
                    fail_silently=False,
                )
                logger.info(f"Emails sent to {len(recipients)} recipients")
            return True
        except Exception as e:
            logger.error(f"Email send failed: {str(e)}")
            return False

    def _send_push_notification(self, reminder):
        """Send push notifications via Expo"""
        try:
            expo_tokens = [
                t for t in reminder.recipients.exclude(expo_push_token__isnull=True)
                .values_list('expo_push_token', flat=True) if t
            ]
            if not expo_tokens:
                return True

            response = requests.post(
                'https://api.expo.dev/v2/push/send',
                json={
                    'to': expo_tokens,
                    'title': reminder.subject,
                    'body': reminder.message,
                    'sound': 'default'
                },
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Expo push failed: {response.text}")
                return False
            return True
        except Exception as e:
            logger.error(f"Push notification failed: {str(e)}")
            return False

    def _send_reminder(self, reminder):
        """Send reminder through all specified channels"""
        channel_results = {
            'sms': reminder.channel in ['sms', 'all'] and self._send_sms(reminder),
            'email': reminder.channel in ['email', 'all'] and self._send_email(reminder),
            'push': reminder.channel in ['push', 'all'] and self._send_push_notification(reminder),
        }

        if all(channel_results.values()):
            reminder.status = 'sent'
            reminder.sent_at = timezone.now()
        else:
            reminder.status = 'failed'
        reminder.save()

        return reminder.status == 'sent'

    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None, edir_slug=None):
        """Endpoint to immediately send a pending reminder"""
        reminder = self.get_object()
        
        if reminder.status != 'pending':
            return Response(
                {'error': 'Reminder has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = self._send_reminder(reminder)
        
        return Response(
            {
                'status': 'sent' if success else 'failed',
                'message': 'Reminder sent successfully' if success else 'Failed to send reminder'
            },
            status=status.HTTP_200_OK if success else status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    @action(detail=False, methods=['post'])
    def send_monthly_reminders(self, request, edir_slug=None):
        """Endpoint to send monthly payment reminders to unpaid members"""
        edir = get_object_or_404(Edir, slug=edir_slug)
        today = datetime.now().date()
        
        # Get unpaid members for current month
        paid_members = Payment.objects.filter(
            edir=edir,
            payment_type='monthly',
            payment_date__month=today.month,
            payment_date__year=today.year,
            status='completed'
        ).values_list('member', flat=True)
        
        unpaid_members = Member.objects.filter(edir=edir).exclude(id__in=paid_members)
        
        if not unpaid_members.exists():
            return Response(
                {'status': 'completed', 'message': 'All members have paid this month'},
                status=status.HTTP_200_OK
            )
        
        # Create and send reminder
        reminder = Reminder.objects.create(
            edir=edir,
            reminder_type='payment_due',
            subject=f'Monthly Payment Reminder - {today.strftime("%B %Y")}',
            message=f'Please pay your monthly contribution of {edir.monthly_fee} birr',
            scheduled_time=timezone.now(),
            status='pending',
            channel='all',
            created_by=request.user
        )
        reminder.recipients.set(unpaid_members)
        
        success = self._send_reminder(reminder)
        
        return Response(
            {
                'status': 'sent' if success else 'failed',
                'message': f'Reminders sent to {unpaid_members.count()} members',
                'reminder_id': reminder.id
            },
            status=status.HTTP_200_OK if success else status.HTTP_500_INTERNAL_SERVER_ERROR
        )