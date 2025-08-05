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
    CheckoutView,
    ProtectedView
)

# Use a single router for all top-level resources
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-item')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-items', OrderItemViewSet, basename='order-item')

urlpatterns = [
    # Include all the router URLs
    path('', include(router.urls)),

    # Custom API paths
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('protected/', ProtectedView.as_view(), name='protected-view'),
]
