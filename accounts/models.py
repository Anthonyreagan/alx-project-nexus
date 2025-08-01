
from django.db import models
from django.contrib.auth.models import AbstractUser # Import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    You can add additional fields here specific to your e-commerce users if needed.
    For now, it inherits all standard fields like username, email, password, etc.
    """
    # Example of adding a custom field (uncomment if you need it)
    # phone_number = models.CharField(max_length=20, blank=True, null=True)
    pass # No custom fields added for now, just using AbstractUser's fields

# --- Category Model ---