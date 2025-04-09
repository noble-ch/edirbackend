from django import forms
from .models import EdirRequest
from django.core.validators import RegexValidator

class EdirRequestForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Create a strong password'
        }),
        min_length=8,
        validators=[
            RegexValidator(
                regex=r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])',
                message='Password must contain at least one uppercase, lowercase, number and special character'
            )
        ]
    )
    
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'your@email.com'
        })
    )

    class Meta:
        model = EdirRequest
        fields = ['full_name', 'username', 'email', 'password', 'edir_name', 'edir_description']
        widgets = {
            'full_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Abebe Kebede'
            }),
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'abebekebede'
            }),
            'edir_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'My Edir Community'
            }),
            'edir_description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Describe your Edir community purpose...',
                'rows': 4
            }),
        }
        labels = {
            'full_name': 'Full Name',
            'username': 'Username',
            'edir_name': 'Edir Name',
            'edir_description': 'Description'
        }