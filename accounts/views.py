# accounts/views.py

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import UserSerializer
from .models import User

class UserRegistrationView(generics.CreateAPIView):
    """
    API view for user registration.
    - create: Creates a new user with the provided username, email, and password.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny] # Allow anyone to register a new account


class UserDetailView(generics.RetrieveAPIView):
    """
    API view to retrieve the details of the currently authenticated user.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] # Only authenticated users can access this view

    def get_object(self):
        """
        Overrides the default get_object to return the current user.
        """
        return self.request.user
