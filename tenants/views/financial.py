from django.forms import ValidationError
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
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class CbeVerificationError(Exception):
    """Base exception for CBE verification issues."""
    pass

class CbeServiceRetrievalError(CbeVerificationError):
    """Indicates an error in retrieving the document from CBE (network, Playwright setup/navigation, PDF not found)."""
    def __init__(self, message, underlying_error=None):
        super().__init__(message)
        self.underlying_error = underlying_error

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


    def get_permissions(self):
        if self.action in ['create', 'bulk_create']:
            self.permission_classes = [IsTreasurerOrHead]
        elif self.action in ['verify']:
            self.permission_classes = [IsEdirMember]
        return super().get_permissions()

    def get_queryset(self):
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        user = self.request.user
        
        if user.is_superuser:
            return self.queryset.filter(edir=edir)
            
        try:
            member = Member.objects.get(user=user, edir=edir)
            print(f"Member found: {member.role} (ID: {member.id})")
            
            # Head or treasurer can see all payments
            if edir.head == user or member.role.lower() == 'treasurer':
                return self.queryset.filter(edir=edir)
                
            # Regular members can only see their own payments
            return self.queryset.filter(edir=edir, member=member)
            
        except Member.DoesNotExist:
            return Payment.objects.none()

    @action(detail=False, methods=['post'], permission_classes=[IsTreasurerOrHead])
    def bulk_create(self, request, edir_slug=None):
        """
        Create payments for all members of the edir
        Only accessible by treasurer or head
        """
        edir = get_object_or_404(Edir, slug=edir_slug)
        requesting_member = get_object_or_404(Member, user=request.user, edir=edir)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get all active members except the creator (if needed)
        members = Member.objects.filter(edir=edir, is_active=True)
        
        # Create payments for each member
        payments = []
        current_date = timezone.now().date()
        
        for mem in members:
            payment = Payment(
                member=mem,
                edir=edir,  # This is the critical fix - set the edir relationship
                amount=serializer.validated_data['amount'],
                payment_type=serializer.validated_data['payment_type'],
                payment_date=current_date,
                notes=serializer.validated_data.get('notes', ''),
                status='pending'
            )
            payment.save()
            payments.append(payment)
        
        return Response(
            self.get_serializer(payments, many=True).data,
            status=status.HTTP_201_CREATED
        )
        
    
    def perform_create(self, serializer):
        """
        Single payment creation - still only for treasurer/head
        """
        edir_slug = self.kwargs.get('edir_slug')
        edir = get_object_or_404(Edir, slug=edir_slug)
        requesting_member = get_object_or_404(Member, user=self.request.user, edir=edir)
        payment_date = timezone.now().date()
        # Set default values
        serializer.validated_data.update({
            'edir': edir,
            'payment_date': payment_date,
            'status': 'pending',
            'payment_method': 'bank_transfer'
        })
        

        if 'member' not in serializer.validated_data:
            raise ValidationError({"member": "This field is required."})
            
        serializer.save()


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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify(self, request, edir_slug=None, pk=None): 
        payment = self.get_object()
        
        edir = get_object_or_404(Edir, slug=edir_slug)
        if payment.edir != edir:
            return Response(
                {'error': 'Payment does not belong to this edir'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cbe_account_number = getattr(edir, 'cbe_account_number', None)
        account_holder_name = getattr(edir, 'account_holder_name', None)
        
        # Determine how to call verify_cbe based on request data
        full_cbe_url_from_request = request.data.get('full_cbe_url')
        reference_id_part_from_request = request.data.get('reference_id_part')
        account_suffix_from_request = request.data.get('account_suffix')

        call_args = {}
        if full_cbe_url_from_request and str(full_cbe_url_from_request).strip():
            call_args['full_url_input'] = str(full_cbe_url_from_request).strip()
        elif (reference_id_part_from_request and str(reference_id_part_from_request).strip() and
              account_suffix_from_request and str(account_suffix_from_request).strip()):
            call_args['reference_id_part'] = str(reference_id_part_from_request).strip()
            call_args['account_suffix'] = str(account_suffix_from_request).strip()
        else:
            return Response(
                {
                    'status': 'failed',
                    'error_type': 'missing_input',
                    'error': "Required parameters missing. Provide either a non-empty 'full_cbe_url' or "
                             "both non-empty 'reference_id_part' and 'account_suffix'.",
                    'message': 'Invalid input parameters for verification.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            verification_result = verify_cbe(**call_args)
            
            # --- Same logic as before for handling verification_result ---
            if not verification_result['success']:
                payment.status = 'failed'
                payment.verification_error = verification_result.get('error', 'Verification failed: Could not process receipt details.')
                payment.verified_at = timezone.now()
                payment.save()
                return Response(
                    {
                        'status': 'failed',
                        'error_type': 'parsing_error',
                        'error': payment.verification_error,
                        'message': 'Payment verification failed. Could not process receipt details.'
                    },
                    status=status.HTTP_200_OK
                )

            receiver_account_pdf = verification_result.get('receiver_account')
            receiver_name_pdf = (verification_result.get('receiver') or '').lower()
            
            edir_cbe_acc_num_last4 = str(cbe_account_number)[-4:].lower() if cbe_account_number else None
            edir_acc_holder_name_lower = account_holder_name.lower() if account_holder_name else None

            mismatch_details = []
            validation_passed = True

            if edir_cbe_acc_num_last4:
                if not receiver_account_pdf:
                    validation_passed = False
                    mismatch_details.append("Receiver account missing in PDF, but expected by Edir.")
                elif str(receiver_account_pdf)[-4:].lower() != edir_cbe_acc_num_last4:
                    validation_passed = False
                    mismatch_details.append(f"Receiver account number mismatch (Expected ending: ...{edir_cbe_acc_num_last4}, Got: ...{str(receiver_account_pdf)[-4:]}).")
            
            if edir_acc_holder_name_lower:
                if not receiver_name_pdf:
                    validation_passed = False
                    mismatch_details.append("Receiver name missing in PDF, but expected by Edir.")
                elif receiver_name_pdf != edir_acc_holder_name_lower:
                    validation_passed = False
                    mismatch_details.append(f"Receiver name mismatch (Expected: '{account_holder_name}', Got: '{verification_result.get('receiver')}').")

            if not edir_cbe_acc_num_last4 and not edir_acc_holder_name_lower:
                 logger.info(f"No CBE account or holder name configured for Edir {edir_slug} for validation. Skipping receiver check for payment {pk}.")

            if not validation_passed:
                final_mismatch_error = "Receiver details mismatch: " + "; ".join(mismatch_details)
                payment.status = 'failed'
                payment.verification_error = final_mismatch_error
                payment.verified_at = timezone.now()
                payment.payer_name = verification_result.get('payer')
                payment.payer_account = verification_result.get('payer_account')
                payment.transaction_reference = verification_result.get('reference')
                payment.verification_details = {
                    'retrieved_receiver': verification_result.get('receiver'),
                    'retrieved_receiver_account': verification_result.get('receiver_account'),
                    'retrieved_amount': verification_result.get('amount'),
                    'retrieved_date': verification_result.get('date').isoformat() if verification_result.get('date') else None,
                    'retrieved_reason': verification_result.get('reason'),
                }
                payment.save()
                return Response(
                    {
                        'status': 'failed',
                        'error_type': 'receiver_mismatch',
                        'error': final_mismatch_error,
                        'message': 'Payment verification failed due to receiver details mismatch.'
                    },
                    status=status.HTTP_200_OK
                )

            payment.status = 'completed'
            payment.verified_at = timezone.now()
            payment.transaction_reference = verification_result.get('reference')
            payment.payer_name = verification_result.get('payer')
            payment.payer_account = verification_result.get('payer_account')
            payment.transaction_date = verification_result.get('date')
            payment.amount = verification_result.get('amount', payment.amount)
            payment.verification_error = None
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
                        'receiver': payment.verification_details.get('receiver'),
                        'receiver_account': payment.verification_details.get('receiver_account'),
                        'amount': payment.amount,
                        'date': payment.transaction_date.isoformat() if payment.transaction_date else None,
                        'reference': payment.transaction_reference,
                    }
                },
                status=status.HTTP_200_OK
            )

        except ValueError as e_val: # Catches invalid arguments passed to verify_cbe
            logger.warning(
                f"Invalid arguments for CBE verification: {str(e_val)} (Payment PK: {pk}, Edir: {edir_slug})"
            )
            return Response(
                {
                    'status': 'failed', # This is a client input error, so verification process itself failed due to bad input
                    'error_type': 'invalid_input',
                    'error': str(e_val),
                    'message': 'Invalid input parameters for verification.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except CbeServiceRetrievalError as e_service:
            logger.warning(
                f"CBE service retrieval error for payment {pk} (Edir {edir_slug}): {str(e_service)}", 
                exc_info=True # Set to False if too verbose for just retrieval errors
            )
            return Response(
                {
                    'status': 'error',
                    'error_type': 'service_unavailable',
                    'error': 'Verification service temporarily unavailable. Could not retrieve document.',
                    'message': 'Please try again later. The payment status remains unchanged.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e_unexpected:
            logger.error(
                f"Unexpected error during payment {pk} verification (Edir {edir_slug}): {str(e_unexpected)}", 
                exc_info=True
            )
            return Response(
                {
                    'status': 'error',
                    'error_type': 'internal_server_error',
                    'error': 'An unexpected internal error occurred during verification.',
                    'message': 'Please try again later or contact support. The payment status remains unchanged.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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