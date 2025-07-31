from django.urls import path
from .views import ProtectedView # Import ProtectedView from your views.py

urlpatterns = [
    # Defines a URL path for the protected API view.
    # When a GET request is made to 'api/protected/', the ProtectedView will handle it.
    path('protected/', ProtectedView.as_view(), name='protected-view'),
]