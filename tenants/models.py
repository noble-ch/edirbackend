from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.conf import settings
import re
from django.utils import timezone
from django.core.validators import MinValueValidator, RegexValidator

class User(AbstractUser):
    pass
class Edir(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField()
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    head = models.OneToOneField('User', null=True, blank=True, on_delete=models.SET_NULL, related_name='owned_edir')
    unique_link = models.CharField(max_length=255, unique=True, blank=True)
    
    # New financial fields
    cbe_account_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[RegexValidator(
            regex=r'^\d{13}$',
            message='CBE account number must be 13 digits'
        )]
    )
    account_holder_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Name as it appears on the bank account"
    )
    address = models.TextField(
        blank=True,
        null=True,
        help_text="Physical address of the Edir"
    )
    initial_deposit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Initial deposit amount in ETB"
    )
    current_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Current balance in ETB"
    )

    def clean(self):
        if not re.match(r'^[a-zA-Z0-9\s\-\.]+$', self.name):
            raise ValidationError("Name can only contain letters, numbers, spaces, hyphens, and periods.")
        
        # Validate CBE account number if provided
        if self.cbe_account_number and not re.match(r'^\d{13}$', self.cbe_account_number):
            raise ValidationError({
                'cbe_account_number': 'CBE account number must be exactly 13 digits'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        if not self.slug:
            base_slug = slugify(self.name) or "edir"
            base_slug = re.sub(r'[^a-z0-9\-]', '', base_slug.lower()) or "edir"
            slug = base_slug
            count = 1
            while Edir.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{count}"
                count += 1
            self.slug = slug

        if not self.unique_link:
            self.unique_link = f"http://{settings.EDIR_DOMAIN}/{self.slug}/"
            count = 1
            while Edir.objects.filter(unique_link=self.unique_link).exclude(pk=self.pk).exists():
                self.unique_link = f"http://{settings.EDIR_DOMAIN}/{self.slug}-{count}/"
                count += 1

        # Set initial balance if this is a new record
        if not self.pk and self.initial_deposit > 0:
            self.current_balance = self.initial_deposit

        super().save(*args, **kwargs)

    def update_balance(self, amount):
        """Helper method to safely update the balance"""
        self.current_balance = F('current_balance') + amount
        self.save(update_fields=['current_balance'])
        self.refresh_from_db()

    def __str__(self):
        return self.name


class EdirRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    full_name = models.CharField(max_length=100)
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    password = models.CharField(max_length=128)
    edir_name = models.CharField(max_length=100)
    edir_description = models.TextField()
    
    # New fields in EdirRequest to match Edir
    proposed_cbe_account = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[RegexValidator(
            regex=r'^\d{13}$',
            message='CBE account number must be 13 digits'
        )],
        help_text="Proposed CBE account number for the Edir"
    )
    proposed_account_holder = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Proposed account holder name"
    )
    proposed_address = models.TextField(
        blank=True,
        null=True,
        help_text="Proposed physical address of the Edir"
    )
    proposed_initial_deposit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Proposed initial deposit amount in ETB"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    processed = models.BooleanField(default=False)

    def clean(self):
        # Validate proposed CBE account number if provided
        if self.proposed_cbe_account and not re.match(r'^\d{13}$', self.proposed_cbe_account):
            raise ValidationError({
                'proposed_cbe_account': 'CBE account number must be exactly 13 digits'
            })

    def approve(self):
        """Method to approve the request and create the Edir"""
        if self.processed:
            raise ValueError("This request has already been processed")
        
        # Create the Edir with all the provided information
        edir = Edir(
            name=self.edir_name,
            description=self.edir_description,
            approved=True,
            cbe_account_number=self.proposed_cbe_account,
            account_holder_name=self.proposed_account_holder,
            address=self.proposed_address,
            initial_deposit=self.proposed_initial_deposit
        )
        edir.save()
        
        # Create the user
        user = User.objects.create_user(
            username=self.username,
            email=self.email,
            password=self.password,
            first_name=self.full_name.split()[0],
            last_name=' '.join(self.full_name.split()[1:]) if len(self.full_name.split()) > 1 else ''
        )
        
        # Set the user as the head of the Edir
        edir.head = user
        edir.save()
        
        # Mark the request as processed
        self.status = 'approved'
        self.processed = True
        self.save()
        
        return edir

    def __str__(self):
        return f"{self.edir_name} - {self.username}"

class Member(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    ROLE_CHOICES = [
        ('TREASURER', 'Treasurer'),
        ('PROPERTY_MANAGER', 'Property Manager'),
        ('COORDINATOR', 'Event Coordinator'),
        ('MEMBER', 'Regular Member'),
    ]
    REGISTRATION_TYPE_CHOICES = [
        ('single', 'Single'),
        ('family', 'Family'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MEMBER')
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='member')
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='members')
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    home_or_alternate_phone = models.CharField(max_length=20, blank=True, null=True)
    registration_type = models.CharField(max_length=10, choices=REGISTRATION_TYPE_CHOICES, default='single')
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.edir.name})"

    @property
    def is_approved(self):
        return self.status == 'approved'

    def is_head(self):
        return self.edir.head == self

    def is_admin(self):
        return self.role == 'ADMIN'

    def is_head_or_admin(self):
        return self.is_head() or self.is_admin()
    
class Spouse(models.Model):
    member = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='spouse')
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)

class FamilyMember(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='family_members')
    full_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10)
    date_of_birth = models.DateField(blank=True, null=True)
    relationship = models.CharField(max_length=50)

class Representative(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='representatives')
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    date_of_designation = models.DateField(default=timezone.now)
    
    
class Event(models.Model):
    EVENT_TYPE_CHOICES = [
        ('bereavement', 'Bereavement'),
        ('wedding', 'Wedding'),
        ('birth', 'Birth'),
        ('graduation', 'Graduation'),
        ('meeting', 'Meeting'),
        ('fundraising', 'Fundraising'),
        ('other', 'Other'),
    ]

    
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200)
    created_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.title} ({self.edir.name})"

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('attending', 'Attending'),
        ('not_attending', 'Not Attending'),
        ('maybe', 'Maybe'),
        ('no_response', 'No Response'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendances')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='attendances')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='no_response')
    responded_at = models.DateTimeField(auto_now=True)
    note = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ('event', 'member')
    def save(self, *args, **kwargs):
        if self.pk is None or self.status != 'no_response': 
             original = Attendance.objects.filter(pk=self.pk).first()
             if not original or original.status == 'no_response' or original.status != self.status:
                 self.responded_at = timezone.now()
        elif self.status == 'no_response':
            self.responded_at = None
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member.full_name} - {self.event.title}"

class Contribution(models.Model):
    PAYMENT_METHOD_CHOICES = [ 
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('mobile_money', 'Mobile Money'),
        ('check', 'Check'),
        ('other', 'Other'),
    ]
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='contributions')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='contributions')
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='contributions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES)
    payment_date = models.DateField()
    
    confirmed_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='confirmed_contributions')
    confirmed_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True, null=True)

    def clean(self):
        if self.member and self.member.edir != self.edir:
            raise ValidationError("Contributing member must belong to the contribution's Edir.")
        if self.confirmed_by and self.confirmed_by.edir != self.edir:
            raise ValidationError("Confirming member must belong to the contribution's Edir.")
        if self.event and self.event.edir != self.edir:
            raise ValidationError("Event must belong to the contribution's Edir.")
        if self.amount <= 0:
             raise ValidationError("Contribution amount must be positive.")

    def __str__(self):
        event_str = f" for {self.event.title}" if self.event else f" to {self.edir.name}"
        return f"{self.member.full_name} - {self.amount}{event_str}"

class Expense(models.Model):
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='expenses')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='expenses')
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    spent_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='expenses')
    spent_date = models.DateField()
    receipt = models.FileField(upload_to='expense_receipts/', null=True, blank=True)
    approved_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='approved_expenses')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.description} - {self.amount}"
    
class TaskGroup(models.Model):
    SHIFT_CHOICES = [
        ('morning', 'Morning (8AM-12PM)'),
        ('afternoon', 'Afternoon (12PM-4PM)'),
        ('evening', 'Evening (4PM-8PM)'),
        ('night', 'Night (8PM-12AM)'),
        ('custom', 'Custom Shift'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, null=True, blank=True)
    members = models.ManyToManyField(Member, related_name='task_groups')
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, blank=True, null=True)
    shift_custom = models.CharField(max_length=100, blank=True, null=True)
    created_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='created_task_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def get_shift_display(self):
        if self.shift == 'custom':
            return self.shift_custom
        return dict(self.SHIFT_CHOICES).get(self.shift, '')

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    SHIFT_CHOICES = TaskGroup.SHIFT_CHOICES

    task_group = models.ForeignKey(TaskGroup, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField()
    assigned_to = models.ManyToManyField(Member, related_name='assigned_tasks')
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, blank=True, null=True)
    shift_custom = models.CharField(max_length=100, blank=True, null=True)
    assigned_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='assigned_tasks_by')
    due_date = models.DateTimeField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def get_shift_display(self):
        if self.shift == 'custom':
            return self.shift_custom
        return dict(self.SHIFT_CHOICES).get(self.shift, '')

class EventReport(models.Model):
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='report')
    prepared_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='prepared_reports')
    attendance_summary = models.JSONField() 
    financial_summary = models.JSONField() 
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report for {self.event.title}"
    





class Resource(models.Model):
    CATEGORY_CHOICES = [
        ('equipment', 'Equipment'),
        ('venue', 'Venue'),
        ('supply', 'Supply'),
        ('service', 'Service'),
        ('other', 'Other'),
    ]
    
    CONDITION_CHOICES = [
        ('new', 'New'),
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('broken', 'Broken'),
    ]
    
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='resources')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    available = models.BooleanField(default=True)
    
    # Pricing fields
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rental_price_per_day = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    replacement_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Additional details
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    purchase_date = models.DateField(null=True, blank=True)
    expected_lifespan = models.PositiveIntegerField(null=True, blank=True, help_text="Expected lifespan in months")
    serial_number = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    
    # Maintenance fields
    last_maintenance_date = models.DateField(null=True, blank=True)
    maintenance_frequency = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        help_text="Recommended maintenance frequency in days"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.edir.name})"

    @property
    def current_value(self):
        """Calculate depreciated value based on purchase date and lifespan"""
        if self.purchase_price and self.purchase_date and self.expected_lifespan:
            from datetime import date
            from dateutil.relativedelta import relativedelta
            
            today = date.today()
            months_used = relativedelta(today, self.purchase_date).months
            if months_used >= self.expected_lifespan:
                return 0
            depreciation = (self.purchase_price / self.expected_lifespan) * months_used
            return max(0, self.purchase_price - depreciation)
        return None


class ResourceAllocation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('returned', 'Returned'),
        ('rented', 'rented'),
        ('cancelled', 'Cancelled'),
    ]
    
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='allocations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='resource_allocations')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='resource_requests')
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    
    # Date fields
    requested_at = models.DateTimeField(auto_now_add=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Status fields
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_changed_at = models.DateTimeField(auto_now=True)
    
    # Financial fields
    calculated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Additional information
    purpose = models.TextField()
    special_requirements = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        Member, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='approved_allocations'
    )
    approval_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.resource.name} for {self.event.title}"

    def save(self, *args, **kwargs):
        """Calculate cost when saving"""
        if self.resource.rental_price_per_day and self.start_date and self.end_date:
            from datetime import timedelta
            rental_days = (self.end_date - self.start_date).days + 1
            self.calculated_cost = self.resource.rental_price_per_day * rental_days * self.quantity
        super().save(*args, **kwargs)

    @property
    def duration_days(self):
        """Return allocation duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0


class ResourceUsage(models.Model):
    USAGE_CONDITION_CHOICES = [
        ('excellent', 'Excellent - No visible wear'),
        ('good', 'Good - Minor wear'),
        ('fair', 'Fair - Noticeable wear but functional'),
        ('poor', 'Poor - Needs repair soon'),
        ('damaged', 'Damaged - Needs immediate repair'),
    ]
    
    allocation = models.OneToOneField(ResourceAllocation, on_delete=models.CASCADE, related_name='usage')
    
    # Actual usage times
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Condition tracking
    pre_use_condition = models.CharField(max_length=20, choices=USAGE_CONDITION_CHOICES)
    post_use_condition = models.CharField(max_length=20, choices=USAGE_CONDITION_CHOICES)
    condition_notes = models.TextField(blank=True)
    
    # Quantity tracking
    requested_quantity = models.PositiveIntegerField()
    returned_quantity = models.PositiveIntegerField(default=0)
    damaged_quantity = models.PositiveIntegerField(default=0)
    
    # Financials
    additional_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    damage_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deposit_returned = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Administrative
    checked_out_by = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checked_out_resources'
    )
    checked_in_by = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checked_in_resources'
    )
    usage_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Usage record for {self.allocation.resource.name}"

    @property
    def actual_duration_days(self):
        """Return actual usage duration in days"""
        if self.actual_start and self.actual_end:
            return (self.actual_end - self.actual_start).days + 1
        return 0

    @property
    def condition_changed(self):
        """Check if condition changed during usage"""
        return self.pre_use_condition != self.post_use_condition
    
 




    


class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('contribution', 'Event Contribution'),
        ('monthly', 'Monthly Fee'),
        ('penalty', 'Penalty'),
        ('donation', 'Donation'),
        ('other', 'Other'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='payments')
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    payment_method = models.CharField(max_length=20, choices=Contribution.PAYMENT_METHOD_CHOICES)
    payment_date = models.DateField()
    transaction_reference = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    verified_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='verified_payments')
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Link to related objects
    contribution = models.OneToOneField(Contribution, on_delete=models.SET_NULL, null=True, blank=True)
    event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.member.full_name} - {self.amount} ({self.get_payment_type_display()})"

class Penalty(models.Model):
    PENALTY_TYPE_CHOICES = [
        ('late_payment', 'Late Payment'),
        ('absence', 'Event Absence'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('waived', 'Waived'),
        ('cancelled', 'Cancelled'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='penalties')
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='penalties')
    penalty_type = models.CharField(max_length=20, choices=PENALTY_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment = models.OneToOneField(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, related_name='created_penalties')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.member.full_name} - {self.amount} ({self.get_penalty_type_display()})"

class Reminder(models.Model):
    REMINDER_TYPE_CHOICES = [
        ('payment_due', 'Payment Due'),
        ('event_reminder', 'Event Reminder'),
        ('task_reminder', 'Task Reminder'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('all', 'All Channels'),
    ]
    
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='reminders')
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    recipients = models.ManyToManyField(Member, related_name='reminders')
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='email')
    related_event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True)
    related_payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, related_name='created_reminders')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.get_reminder_type_display()} - {self.subject}"

class FinancialReport(models.Model):
    REPORT_TYPE_CHOICES = [
        ('monthly', 'Monthly'),
        ('event', 'Event'),
        ('annual', 'Annual'),
        ('custom', 'Custom Period'),
    ]
    
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE, related_name='financial_reports')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    report_data = models.JSONField()
    generated_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    generated_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.title} - {self.edir.name}"