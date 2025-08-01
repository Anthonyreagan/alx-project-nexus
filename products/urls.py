# products/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    ProductViewSet,
    CartViewSet,
    CartItemViewSet,
    OrderViewSet,
    OrderItemViewSet,
    ProtectedView,
)

# Create a router instance
router = DefaultRouter()

# Register each ViewSet with the router.
# This automatically generates URL patterns for each action (list, detail, create, etc.).
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-item')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-items', OrderItemViewSet, basename='order-item')


urlpatterns = [
    # Include the router's URLs. This line replaces all the individual path() definitions.
    path('', include(router.urls)),

    # The ProtectedView is a standard APIView, so we still need to register it manually.
    path('protected-test/', ProtectedView.as_view(), name='protected-test'),
]
