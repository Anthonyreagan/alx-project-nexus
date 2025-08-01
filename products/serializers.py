# products/serializers.py

from rest_framework import serializers
from .models import Category, Product, Cart, CartItem, Order, OrderItem
from accounts.models import User

# --- Category Serializer ---
class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the Category model.
    It serializes all fields of the Category model.
    """
    class Meta:
        model = Category
        fields = '__all__' # Includes all fields from the Category model


# --- Product Serializer ---
class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for the Product model.
    Includes a nested CategorySerializer to display full category details.
    """
    # Use the CategorySerializer to represent the category foreign key.
    # This will display the full category object instead of just its primary key.
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        # We specify the fields explicitly here to demonstrate the nested serializer.
        fields = [
            'id',
            'name',
            'description',
            'price',
            'category',
            'stock',
            'available',
            'created_at',
            'updated_at'
        ]


# --- CartItem Serializer ---
class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for a single item within a shopping cart.
    It also nests the ProductSerializer to show full product details.
    """
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'added_at']
        read_only_fields = ['added_at']


# --- Cart Serializer ---
class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for the main Cart model.
    It includes a nested list of CartItems to show all products in the cart.
    """
    user = serializers.ReadOnlyField(source='user.username')
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


# --- OrderItem Serializer ---
class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for a single item within an order.
    It includes nested product details to capture the state at the time of the order.
    """
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'price']
        read_only_fields = ['id']


# --- Order Serializer ---
class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the Order model.
    It includes a nested list of OrderItems to show all products in the order.
    """
    user = serializers.ReadOnlyField(source='user.username')
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'user',
            'total_amount',
            'status',
            'items',
            'ordered_at',
            'updated_at'
        ]
        read_only_fields = ['ordered_at', 'updated_at']

