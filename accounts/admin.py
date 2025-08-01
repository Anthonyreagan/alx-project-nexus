# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Customizes the admin interface for the User model.
    """
    model = User
    list_display = ('username', 'email', 'is_staff')
    # Add other customizations here if needed