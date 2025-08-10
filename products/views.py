# products/views.py

from rest_framework import viewsets, filters, generics, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from django.db import transaction
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Category, Product, Cart, CartItem, Order, OrderItem
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    OrderItemSerializer,
)


# ----------------- Category & Product ViewSets -----------------

class CategoryViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing product categories.
    - Public users can list and retrieve categories.
    - Authenticated admin users can create, update, and delete categories.
    """
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        # Only allow admin users to modify categories
        if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()


class ProductViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing products.
    - Public users can list and retrieve products.
    - Authenticated admin users can create, update, and delete products.
    Includes filtering, searching, and ordering.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    # Enable filtering, searching, and ordering
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Define which fields can be filtered
    filterset_fields = ['category', 'available']

    # Define which fields can be searched
    search_fields = ['name', 'description']

    # Define which fields can be ordered
    ordering_fields = ['name', 'price', 'created_at']

    def get_permissions(self):
        # Only allow admin users to modify products
        if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()


# ----------------- Cart & Order ViewSets -----------------

class CartViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for a user's shopping cart.
    - Allows authenticated users to view their own cart.
    - Cart items are managed via the CartItemViewSet.
    """
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Ensures a user can only see their own cart.
        """
        # Get or create the cart for the current user
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return Cart.objects.filter(pk=cart.pk)


class CartItemViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing items within a user's cart.
    - Allows authenticated users to create, retrieve, update, and delete items in their cart.
    - The `perform_create` method handles adding to or updating an existing item.
    """
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Ensures a user can only manage items in their own cart.
        """
        # Get or create the cart for the current user
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return CartItem.objects.filter(cart=cart)

    def perform_create(self, serializer):
        """
        Custom create method to handle adding a product to the cart.
        If the product already exists in the cart, its quantity is updated.
        """
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        product_id = self.request.data.get('product_id')
        quantity = self.request.data.get('quantity', 1)

        product = get_object_or_404(Product, id=product_id)
        if product.stock < quantity:
            return Response(
                {"detail": "Not enough stock for this product."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for a user's orders.
    - This is a ReadOnlyModelViewSet as orders are created via the checkout process,
      not directly through this endpoint.
    - Allows authenticated users to view their own orders.
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Ensures a user can only see their own orders.
        """
        return Order.objects.filter(user=self.request.user)


class OrderItemViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for viewing items within a specific order.
    - ReadOnlyModelViewSet to prevent direct creation/modification.
    - The queryset should be filtered by the parent order.
    """
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filters order items by the parent order's ID and ensures the order belongs to the user.
        """
        order_id = self.kwargs['order_pk']
        order = get_object_or_404(Order, pk=order_id, user=self.request.user)
        return OrderItem.objects.filter(order=order)


# ----------------- Custom API Views -----------------

class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        order_items_data = request.data.get('order_items')

        if not order_items_data:
            return Response({"error": "No order items provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate total price correctly from the received data
        try:
            # Convert price to float before summing to ensure correct calculation
            total_price = sum(item['quantity'] * float(item['price']) for item in order_items_data)
        except (TypeError, ValueError):
            return Response({"error": "Invalid price or quantity format in order items."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Create the Order instance. 'total_price' is now a field on the Order model.
                order = Order.objects.create(
                    user=request.user,
                    total_price=total_price, # Pass the calculated total_price to the model's field
                )

                for item_data in order_items_data:
                    try:
                        product = Product.objects.get(id=item_data['product'])
                    except Product.DoesNotExist:
                        # Rollback transaction if any product is not found
                        raise ValueError(f"Product with ID {item_data['product']} not found.")

                    # Create OrderItem
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data['quantity'],
                        price=item_data['price'], # Use the price sent by frontend (or product.price if validated)
                        product_name=product.name # Store name for historical record
                    )

                    # Update product stock (ensure stock is sufficient)
                    if product.stock < item_data['quantity']:
                        raise ValueError(f"Not enough stock for product {product.name}. Available: {product.stock}, Requested: {item_data['quantity']}")
                    product.stock -= item_data['quantity']
                    product.save()

            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            # Catch custom validation errors (e.g., product not found, insufficient stock)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Catch any other unexpected errors
            print(f"Checkout unexpected error: {e}") # Log the full error for debugging
            return Response({"error": "An internal server error occurred during checkout.", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProtectedView(APIView):
    """
    A simple view to test if a user is authenticated with a JWT token.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": f"Hello, {request.user.username}! This is a protected endpoint."})
