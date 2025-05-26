from celery import shared_task
from celery.schedules import crontab
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task
def handle_monthly_payments():
    today = timezone.now().date()
    
    # Send reminders on the 1st of each month
    if today.day == 1:
        logger.info("Sending monthly payment reminders")
        send_monthly_reminders.delay()
    
    # Check for late payments on the 3rd of each month
    if today.day == 3:
        logger.info("Checking for late payments")
        check_late_payments.delay()

@shared_task
def send_monthly_reminders():
    from ..models import Edir, Reminder, Member
    
    for edir in Edir.objects.all():
        members = Member.objects.filter(edir=edir)
        
        for member in members:
            Reminder.objects.create(
                edir=edir,
                member=member,
                reminder_type='monthly_payment',
                message=f"Please pay your monthly contribution of 500 birr for {timezone.now().strftime('%B %Y')}",
                channel='app',
                created_by=edir.head,
                status='pending'
            )
            logger.info(f"Created reminder for {member.user.username}")

@shared_task
def check_late_payments():
    from ..models import Payment, Member, Penalty, Edir
    from datetime import timedelta
    
    today = timezone.now().date()
    first_of_month = today.replace(day=1)
    deadline = first_of_month + timedelta(days=2)  # Payment due by the 2nd
    
    for edir in Edir.objects.all():
        paid_members = Payment.objects.filter(
            edir=edir,
            payment_type='monthly',
            payment_date__gte=first_of_month,
            payment_date__lte=deadline,
            status='completed'
        ).values_list('member_id', flat=True)
        
        unpaid_members = Member.objects.filter(
            edir=edir
        ).exclude(
            id__in=paid_members
        )
        
        for member in unpaid_members:
            # Create penalty
            penalty = Penalty.objects.create(
                edir=edir,
                member=member,
                penalty_type='late_payment',
                amount=10,
                reason=f"Late payment for {first_of_month.strftime('%B %Y')}",
                created_by=edir.head
            )
            logger.info(f"Created penalty for {member.user.username}")
            
            # Create a payment record with the penalty included
            payment = Payment.objects.create(
                edir=edir,
                member=member,
                payment_type='monthly',
                amount=510,  # 500 + 10 penalty
                status='pending',
                due_date=deadline,
                is_penalty_included=True
            )
            logger.info(f"Created late payment record for {member.user.username}")