from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.conf import settings
import re
from django.utils import timezone


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

    def clean(self):
        if not re.match(r'^[a-zA-Z0-9\s\-\.]+$', self.name):
            raise ValidationError("Name can only contain letters, numbers, spaces, hyphens, and periods.")
    
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

        super().save(*args, **kwargs)

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
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    processed = models.BooleanField(default=False)

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
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    edir = models.ForeignKey(Edir, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, null=True, blank=True)  # New field
    created_by = models.ForeignKey(Member, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

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

    task_group = models.ForeignKey(TaskGroup, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField()
    assigned_to = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='assigned_tasks')
    assigned_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='assigned_tasks_by')
    due_date = models.DateTimeField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

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