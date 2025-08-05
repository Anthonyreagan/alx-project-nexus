# accounts/serializers.py

from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model. Handles user creation and validation.
    """
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        """
        Create and return a new user, setting the password correctly.
        """
        # The password field is write-only, so we create the user with `set_password`.
        user = User.objects.create_user(
            username=validated_data['username'],
            # Use .get() to handle optional email gracefully
            email=validated_data.get('email'),
            password=validated_data['password']
        )
        return user
