# accounts/urls.py

from django.urls import path
from .views import UserRegistrationView, UserDetailView

urlpatterns = [
    # Endpoint for user registration
    path('register/', UserRegistrationView.as_view(), name='user-register'),

    # Endpoint to get the details of the currently authenticated user
    path('profile/', UserDetailView.as_view(), name='user-profile'),
]
