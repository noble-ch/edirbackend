import requests
from django.conf import settings
from datetime import datetime
from twilio.rest import Client
from django.utils import timezone

# Using Twilio's free trial (you can get credentials from https://www.twilio.com/try-twilio)
# Or use another free SMS API like TextLocal, ClickSend, etc.
def send_sms(self):
    phone_numbers = [m.phone_number for m in self.recipients.all() if m.phone_number]
    
    if not phone_numbers:
        self.status = 'failed'
        self.save()
        return False
    
    try:
        # Initialize Twilio client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Track if all messages were sent successfully
        all_success = True
        
        for number in phone_numbers:
            try:
                # Format phone number to E.164 format
                formatted_number = self.format_phone_number(number)
                
                # Send SMS via Twilio
                message = client.messages.create(
                    body=f"{self.subject}: {self.message}",
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=formatted_number
                )
                
                # Optional: Log the message SID for tracking
                print(f"Sent SMS to {formatted_number}, SID: {message.sid}")
                
            except Exception as e:
                print(f"Failed to send SMS to {number}: {str(e)}")
                all_success = False
        
        if all_success:
            self.status = 'sent'
            self.sent_at = timezone.now()
            self.save()
            return True
        else:
            # Partial success - some messages failed
            self.status = 'partially_failed'  # You might want to add this status
            self.sent_at = timezone.now()
            self.save()
            return False
            
    except Exception as e:
        print(f"Twilio API error: {str(e)}")
        self.status = 'failed'
        self.save()
        return False

def format_phone_number(self, number):
    """
    Format phone number to E.164 format for Twilio
    Example conversions:
    - 0912345678 -> +251912345678
    - 251912345678 -> +251912345678
    - +251912345678 -> +251912345678 (no change)
    """
    # Remove any non-digit characters first
    cleaned_number = ''.join(filter(str.isdigit, number))
    
    if cleaned_number.startswith('0'):
        return '+251' + cleaned_number[1:]
    elif cleaned_number.startswith('251'):
        return '+' + cleaned_number
    elif cleaned_number.startswith('+251'):
        return cleaned_number
    # Add other country codes if needed
    return '+' + cleaned_number  # Default case