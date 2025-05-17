from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions
from ..permissions import IsEdirHead,IsEdirMember, IsTreasurerOrHead
from datetime import datetime
from ..serializers import ContributionSerializer, ExpenseSerializer, PaymentSerializer, PenaltySerializer, ReminderSerializer, FinancialReportSerializer
from ..models import Contribution, Expense, Member, Event, Payment, Penalty, Reminder, FinancialReport,Edir
from tenants import serializers
from django.db.models import Sum
from .transaction import verify_cbe 


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
    
    

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsEdirMember]

    def get_queryset(self):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        return self.queryset.filter(edir=edir)

    def perform_create(self, serializer):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        member = get_object_or_404(Member, user=self.request.user, edir=edir)
        serializer.save(edir=edir, member=member)

    @action(detail=False, methods=['get'], permission_classes=[IsTreasurerOrHead])
    def summary(self, request, edir_slug=None):
        edir = get_object_or_404(Edir, slug=edir_slug)
        payments = self.get_queryset().filter(edir=edir)
        
        total_payments = payments.filter(status='completed').count()
        total_amount = sum(p.amount for p in payments.filter(status='completed'))
        pending_payments = payments.filter(status='pending').count()
        
        return Response({
            'total_payments': total_payments,
            'total_amount': total_amount,
            'pending_payments': pending_payments,
        })
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsEdirMember])
    def verify(self, request, edir_slug=None, pk=None):
        payment = self.get_object()
        
        # Ensure the payment belongs to the specified edir
        edir = get_object_or_404(Edir, slug=edir_slug)
        if payment.edir != edir:
            return Response(
                {'error': 'Payment does not belong to this edir'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get transaction reference and account suffix from request data
        reference_id_part = request.data.get('reference_id_part')
        account_suffix = request.data.get('account_suffix')
        
        if not reference_id_part or not account_suffix:
            return Response(
                {'error': 'Both reference_id_part and account_suffix are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify the transaction using your function with error handling
            verification_result = verify_cbe(
                reference_id_part=reference_id_part,
                account_suffix=account_suffix
            )
            
            if not verification_result['success']:
                payment.status = 'failed'
                payment.verification_error = verification_result.get('error', 'Verification failed')
                payment.save()
                return Response(
                    {
                        'status': 'failed',
                        'error': verification_result.get('error'),
                        'message': 'Payment verification failed'
                    },
                    status=status.HTTP_200_OK
                )
            
            # Verification succeeded - update payment details
            payment.status = 'completed'
            payment.verified_at = datetime.now()
            payment.transaction_reference = verification_result.get('reference')
            payment.payer_name = verification_result.get('payer')
            payment.payer_account = verification_result.get('payer_account')
            payment.transaction_date = verification_result.get('date')
            payment.amount = verification_result.get('amount', payment.amount)  # Update amount if verified
            payment.verification_details = {
                'receiver': verification_result.get('receiver'),
                'receiver_account': verification_result.get('receiver_account'),
                'reason': verification_result.get('reason'),
            }
            payment.save()
            
            return Response(
                {
                    'status': 'completed',
                    'message': 'Payment verified successfully',
                    'details': {
                        'payer': payment.payer_name,
                        'payer_account': payment.payer_account,
                        'amount': payment.amount,
                        'date': payment.transaction_date,
                        'reference': payment.transaction_reference,
                    }
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Payment verification failed: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Verification service unavailable. Please try again later.',
                    'message': 'An error occurred during verification'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
                
class PenaltyViewSet(viewsets.ModelViewSet):
    queryset = Penalty.objects.all()
    serializer_class = PenaltySerializer
    permission_classes = [IsTreasurerOrHead]  

    def get_queryset(self):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        return self.queryset.filter(edir=edir)

    def perform_create(self, serializer):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        member = get_object_or_404(Member, user=self.request.user, edir=edir)
        serializer.save(edir=edir, created_by=member)

    @action(detail=True, methods=['post'], permission_classes=[IsTreasurerOrHead])
    def waive(self, request, edir_slug=None, pk=None):
        penalty = self.get_object()
        penalty.status = 'waived'
        penalty.save()
        return Response({'status': 'penalty waived'})

class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    permission_classes = [IsEdirMember]

    def get_queryset(self):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        return self.queryset.filter(edir=edir)

    def perform_create(self, serializer):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        member = get_object_or_404(Member, user=self.request.user, edir=edir)
        serializer.save(edir=edir, created_by=member)

    @action(detail=True, methods=['post'], permission_classes=[IsEdirMember])
    def send_now(self, request, edir_slug=None, pk=None):
        reminder = self.get_object()
        # Implement your reminder sending logic here
        reminder.status = 'sent'
        reminder.sent_at = timezone.now()
        reminder.save()
        return Response({'status': 'reminder sent'})

class FinancialReportViewSet(viewsets.ModelViewSet):
    queryset = FinancialReport.objects.all()
    serializer_class = FinancialReportSerializer
    permission_classes = [IsTreasurerOrHead]  # Only treasurers or heads can manage reports

    def get_queryset(self):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        return self.queryset.filter(edir=edir)

    def perform_create(self, serializer):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        member = get_object_or_404(Member, user=self.request.user, edir=edir)
        serializer.save(edir=edir, generated_by=member)

    @action(detail=False, methods=['post'], permission_classes=[IsTreasurerOrHead])
    def generate_monthly(self, request, edir_slug=None):
        edir = get_object_or_404(Edir, slug=edir_slug)
        member = get_object_or_404(Member, user=self.request.user, edir=edir)
        
        today = timezone.now().date()
        start_date = today.replace(day=1)
        
        # Calculate financial data
        payments = Payment.objects.filter(
            edir=edir,
            payment_date__gte=start_date,
            payment_date__lte=today,
            status='completed'
        )
        
        expenses = Expense.objects.filter(
            edir=edir,
            spent_date__gte=start_date,
            spent_date__lte=today
        )
        
        total_income = payments.aggregate(total=Sum('amount'))['total'] or 0
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        report_data = {
            'income': float(total_income),
            'expenses': float(total_expenses),
            'net': float(total_income - total_expenses),
            'details': {
                'contributions': float(payments.filter(payment_type='contribution').aggregate(total=Sum('amount'))['total'] or 0),
                'penalties': float(payments.filter(payment_type='penalty').aggregate(total=Sum('amount'))['total'] or 0),
                'event_expenses': float(expenses.filter(event__isnull=False).aggregate(total=Sum('amount'))['total'] or 0),
                'operational_expenses': float(expenses.filter(event__isnull=True).aggregate(total=Sum('amount'))['total'] or 0)
            }
        }
        
        report = FinancialReport.objects.create(
            edir=edir,
            report_type='monthly',
            title=f"Monthly Report - {today.strftime('%B %Y')}",
            start_date=start_date,
            end_date=today,
            report_data=report_data,
            generated_by=member
        )
        
        # Use the serializer to return the response
        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)