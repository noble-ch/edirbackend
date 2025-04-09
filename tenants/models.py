from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.conf import settings
import re
from django.utils import timezone


# Custom User
class User(AbstractUser):
    pass


# EDIR Entity
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


# EDIR Creation Request
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
    
    
class Role(models.Model):
    ROLE_CHOICES = [
        ('HEAD', 'Head of Edir'),
        ('TREASURER', 'Treasurer (Manages finances)'),
        ('PROPERTY_MANAGER', 'Property Manager'),
        ('COORDINATOR', 'Event Coordinator'),
        ('MEMBER', 'Regular Member'),
    ]
    
    member = models.ForeignKey('Member', on_delete=models.CASCADE, related_name='roles')
    role_type = models.CharField(max_length=20, choices=ROLE_CHOICES)
    date_assigned = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('member', 'role_type')  # Prevent duplicate roles
    
    def __str__(self):
        return f"{self.member.full_name} - {self.get_role_type_display()}"
    
class Member(models.Model):
    REGISTRATION_TYPE_CHOICES = [
        ('single', 'Single'),
        ('family', 'Family'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    edir = models.ForeignKey('Edir', on_delete=models.CASCADE, related_name='members')
    
    full_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    registration_type = models.CharField(max_length=10, choices=REGISTRATION_TYPE_CHOICES, default='single')
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    home_or_alternate_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Standard metadata fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    @property
    def current_roles(self):
        return self.roles.filter(is_active=True)
    
    def has_role(self, role_type):
        return self.roles.filter(role_type=role_type, is_active=True).exists()

    def delete(self, *args, **kwargs):
        """Soft delete implementation"""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()

    def __str__(self):
        return f"{self.full_name} ({self.edir.name})"

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