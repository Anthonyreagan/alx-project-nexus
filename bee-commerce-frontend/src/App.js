import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Home, ShoppingCart, Receipt, User, X, Search, Minus, Plus, Trash2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

async function authFetch(url, options = {}, accessToken) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    return response;
}

function App() {
    // Authentication state
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [user, setUser] = useState(null);

    // Navigation state
    const [currentPage, setCurrentPage] = useState('products');

    // Products state
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [currentPageNum, setCurrentPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Cart state
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Orders state
    const [orders, setOrders] = useState([]);

    // Profile state
    const [profileData, setProfileData] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileEditForm, setProfileEditForm] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: ''
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const decodeJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            console.error('Failed to decode JWT:', e);
            return null;
        }
    };

    const refreshAccessToken = useCallback(async () => {
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Could not refresh token.');
            }

            const data = await response.json();
            setAccessToken(data.access);
            localStorage.setItem('access_token', data.access);
            return true;
        } catch (err) {
            console.error('Failed to refresh token:', err);
            handleLogout();
            return false;
        }
    }, [refreshToken]);

    const fetchProducts = useCallback(async (categoryId = null, search = '', page = 1) => {
        setLoading(true);
        setError(null);
        let url = `${API_BASE_URL}/products/`;
        const params = new URLSearchParams();

        if (categoryId) params.append('category_id', categoryId);
        if (search) params.append('search', search);
        params.append('page', page);
        params.append('page_size', pageSize);

        url += `?${params.toString()}`;

        try {
            let currentAccessToken = accessToken;
            if (!currentAccessToken) {
                const storedAccessToken = localStorage.getItem('access_token');
                const storedRefreshToken = localStorage.getItem('refresh_token');

                if (storedAccessToken) {
                    currentAccessToken = storedAccessToken;
                    setAccessToken(storedAccessToken);
                    setUser(decodeJwt(storedAccessToken));
                } else if (storedRefreshToken) {
                    setRefreshToken(storedRefreshToken);
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        currentAccessToken = localStorage.getItem('access_token');
                        setUser(decodeJwt(currentAccessToken));
                    } else {
                        throw new Error('No valid tokens found or refresh failed. Please log in.');
                    }
                } else {
                    throw new Error('No valid tokens found. Please log in.');
                }
            }

            const response = await authFetch(url, {}, currentAccessToken);

            if (response.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    currentAccessToken = localStorage.getItem('access_token');
                    const retryResponse = await authFetch(url, {}, currentAccessToken);
                    if (!retryResponse.ok) {
                        throw new Error(`Failed to fetch products after token refresh: ${retryResponse.statusText}`);
                    }
                    const data = await retryResponse.json();
                    handleProductsResponse(data, page);
                } else {
                    throw new Error('Session expired. Please log in again.');
                }
            } else if (!response.ok) {
                throw new Error(`Failed to fetch products: ${response.statusText}`);
            } else {
                const data = await response.json();
                handleProductsResponse(data, page);
            }
        } catch (err) {
            setError(err.message);
            console.error('Product fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken, pageSize]);

    const handleProductsResponse = (data, page) => {
        if (data.results) {
            setProducts(data.results);
            setTotalPages(Math.ceil(data.count / pageSize));
            setCurrentPageNum(page);
        } else {
            setProducts(data);
            setTotalPages(1);
            setCurrentPageNum(1);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPageNum(1);
        fetchProducts(selectedCategory, searchQuery, 1);
    };

    const handleLogin = async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            setAccessToken(data.access);
            setRefreshToken(data.refresh);
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            setUser(decodeJwt(data.access));
            setCurrentPage('products');
        } catch (err) {
            setError(err.message);
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (username, email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/accounts/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const messages = Object.values(errorData).flat().join(' ');
                throw new Error(messages || 'Registration failed');
            }

            setCurrentPage('login');
            alert('Registration successful! Please log in.');
        } catch (err) {
            setError(err.message);
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setProducts([]);
        setCartItems([]);
        setOrders([]);
        setProfileData(null);
        setCurrentPage('login');
    };

    const addToCart = (product) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevItems, { ...product, quantity: 1 }];
            }
        });
        alert(`Added ${product.name} to cart!`);
    };

    const removeFromCart = (productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    const updateCartItemQuantity = (productId, quantity) => {
        setCartItems(prevItems => {
            if (quantity <= 0) {
                return prevItems.filter(item => item.id !== productId);
            }
            return prevItems.map(item =>
                item.id === productId ? { ...item, quantity: quantity } : item
            );
        });
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCartPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            alert('Your cart is empty. Please add items before checking out.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (!accessToken) {
                throw new Error('You must be logged in to checkout.');
            }

            const order_items_data = cartItems.map(item => ({
                product: item.id,
                quantity: item.quantity,
                price: item.price,
            }));

            const response = await authFetch(`${API_BASE_URL}/checkout/`, {
                method: 'POST',
                body: JSON.stringify({ order_items: order_items_data }),
            }, accessToken);

            if (!response.ok) {
                const errorData = await response.json();
                const messages = Object.values(errorData).flat().join(' ');
                throw new Error(messages || 'Checkout failed.');
            }

            alert('Checkout successful! Your order has been placed.');
            clearCart();
            setIsCartOpen(false);
            setCurrentPage('orders');
        } catch (err) {
            setError(err.message);
            console.error('Checkout error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/categories/`);
            if (!response.ok) {
                throw new Error(`Failed to fetch categories: ${response.statusText}`);
            }
            const data = await response.json();
            setCategories(data.results || data);
        } catch (err) {
            console.error('Category fetch error:', err);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!accessToken) {
                throw new Error('You must be logged in to view orders.');
            }
            const response = await authFetch(`${API_BASE_URL}/orders/`, {}, accessToken);

            if (response.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    const retryResponse = await authFetch(`${API_BASE_URL}/orders/`, {}, localStorage.getItem('access_token'));
                    if (!retryResponse.ok) {
                        throw new Error(`Failed to fetch orders after token refresh: ${retryResponse.statusText}`);
                    }
                    const data = await retryResponse.json();
                    setOrders(data.results || data);
                } else {
                    throw new Error('Session expired. Please log in again.');
                }
            } else if (!response.ok) {
                throw new Error(`Failed to fetch orders: ${response.statusText}`);
            } else {
                const data = await response.json();
                setOrders(data.results || data);
            }
        } catch (err) {
            setError(err.message);
            console.error('Order fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken]);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!accessToken) {
                throw new Error('You must be logged in to view your profile.');
            }
            const response = await authFetch(`${API_BASE_URL}/accounts/profile/`, {}, accessToken);

            if (response.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    const retryResponse = await authFetch(`${API_BASE_URL}/accounts/profile/`, {}, localStorage.getItem('access_token'));
                    if (!retryResponse.ok) {
                        throw new Error(`Failed to fetch profile after token refresh: ${retryResponse.statusText}`);
                    }
                    const data = await retryResponse.json();
                    setProfileData(data);
                    setProfileEditForm({
                        username: data.username || '',
                        email: data.email || '',
                        first_name: data.first_name || '',
                        last_name: data.last_name || ''
                    });
                } else {
                    throw new Error('Session expired. Please log in again.');
                }
            } else if (!response.ok) {
                throw new Error(`Failed to fetch profile: ${response.statusText}`);
            } else {
                const data = await response.json();
                setProfileData(data);
                setProfileEditForm({
                    username: data.username || '',
                    email: data.email || '',
                    first_name: data.first_name || '',
                    last_name: data.last_name || ''
                });
            }
        } catch (err) {
            setError(err.message);
            console.error('Profile fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (!accessToken) {
                throw new Error('You must be logged in to update your profile.');
            }

            const changedFields = {};
            if (profileEditForm.username !== profileData.username) {
                changedFields.username = profileEditForm.username;
            }
            if (profileEditForm.email !== profileData.email) {
                changedFields.email = profileEditForm.email;
            }
            const newFirstName = profileEditForm.first_name === '' ? null : profileEditForm.first_name;
            const newLastName = profileEditForm.last_name === '' ? null : profileEditForm.last_name;

            if (newFirstName !== (profileData.first_name || null)) {
                changedFields.first_name = newFirstName;
            }
            if (newLastName !== (profileData.last_name || null)) {
                changedFields.last_name = newLastName;
            }

            if (Object.keys(changedFields).length === 0) {
                alert('No changes detected in profile. Nothing to update.');
                setIsEditingProfile(false);
                setLoading(false);
                return;
            }

            const response = await authFetch(`${API_BASE_URL}/accounts/profile/`, {
                method: 'PATCH',
                body: JSON.stringify(changedFields),
            }, accessToken);

            if (!response.ok) {
                const errorData = await response.json();
                const messages = Object.values(errorData).flat().join(' ');
                throw new Error(messages || 'Profile update failed.');
            }

            const updatedData = await response.json();
            setProfileData(updatedData);
            setUser(prevUser => ({ ...prevUser, username: updatedData.username }));
            setIsEditingProfile(false);
            alert('Profile updated successfully!');
        } catch (err) {
            setError(err.message);
            console.error('Profile update error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedAccess = localStorage.getItem('access_token');
        const storedRefresh = localStorage.getItem('refresh_token');

        if (storedAccess) {
            setAccessToken(storedAccess);
            setUser(decodeJwt(storedAccess));
        }
        if (storedRefresh) {
            setRefreshToken(storedRefresh);
        }

        if (storedRefresh && !storedAccess) {
            refreshAccessToken();
        }
    }, [refreshAccessToken]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (refreshToken) {
                refreshAccessToken();
            }
        }, 4 * 60 * 1000);

        return () => clearInterval(interval);
    }, [refreshToken, refreshAccessToken]);

    useEffect(() => {
        if (currentPage === 'products') {
            fetchCategories();
            if (accessToken) {
                fetchProducts(selectedCategory, searchQuery, currentPageNum);
            } else {
                setProducts([]);
            }
        } else if (currentPage === 'orders' && accessToken) {
            fetchOrders();
        } else if (currentPage === 'orders' && !accessToken) {
            setError('Please log in to view your orders.');
            setOrders([]);
            setCurrentPage('login');
        } else if (currentPage === 'profile' && accessToken) {
            fetchProfile();
        } else if (currentPage === 'profile' && !accessToken) {
            setError('Please log in to view your profile.');
            setProfileData(null);
            setCurrentPage('login');
        }
    }, [currentPage, accessToken, selectedCategory, searchQuery, currentPageNum, fetchProducts, fetchCategories, fetchOrders, fetchProfile]);

    const renderPaginationControls = () => {
        if (products.length === 0 || totalPages <= 1) return null;

        return (
            <div className="flex justify-center mt-8">
                <nav className="flex items-center space-x-2">
                    <button
                        onClick={() => fetchProducts(selectedCategory, searchQuery, currentPageNum - 1)}
                        disabled={currentPageNum === 1}
                        className="px-3 py-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPageNum <= 3) {
                            pageNum = i + 1;
                        } else if (currentPageNum >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = currentPageNum - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => fetchProducts(selectedCategory, searchQuery, pageNum)}
                                className={`px-3 py-1 rounded-md ${currentPageNum === pageNum ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}

                    {totalPages > 5 && currentPageNum < totalPages - 2 && (
                        <span className="px-2">...</span>
                    )}

                    {totalPages > 5 && currentPageNum < totalPages - 2 && (
                        <button
                            onClick={() => fetchProducts(selectedCategory, searchQuery, totalPages)}
                            className={`px-3 py-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50`}
                        >
                            {totalPages}
                        </button>
                    )}

                    <button
                        onClick={() => fetchProducts(selectedCategory, searchQuery, currentPageNum + 1)}
                        disabled={currentPageNum === totalPages}
                        className="px-3 py-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </nav>
            </div>
        );
    };

    const renderLoginForm = () => (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
                <h2 className="text-4xl font-extrabold text-center text-indigo-700 mb-8 tracking-tight">Login</h2>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const username = e.target.username.value;
                        const password = e.target.password.value;
                        handleLogin(username, password);
                    }}
                    className="space-y-6"
                >
                    <div>
                        <label htmlFor="username" className="block text-sm font-semibold text-gray-800 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition duration-200"
                            placeholder="Your username"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition duration-200"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transform transition duration-200 hover:scale-105"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p className="mt-8 text-center text-base text-gray-600">
                    Don't have an account?{' '}
                    <button
                        onClick={() => setCurrentPage('register')}
                        className="font-bold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:underline"
                    >
                        Register here
                    </button>
                </p>
            </div>
        </div>
    );

    const renderRegisterForm = () => (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-100 to-teal-200 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
                <h2 className="text-4xl font-extrabold text-center text-teal-700 mb-8 tracking-tight">Register</h2>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const username = e.target.username.value;
                        const email = e.target.email.value;
                        const password = e.target.password.value;
                        handleRegister(username, email, password);
                    }}
                    className="space-y-6"
                >
                    <div>
                        <label htmlFor="reg-username" className="block text-sm font-semibold text-gray-800 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            id="reg-username"
                            name="username"
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base transition duration-200"
                            placeholder="Choose a username"
                        />
                    </div>
                    <div>
                        <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-800 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            id="reg-email"
                            name="email"
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base transition duration-200"
                            placeholder="your@email.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-800 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="reg-password"
                            name="password"
                            required
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base transition duration-200"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed transform transition duration-200 hover:scale-105"
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                <p className="mt-8 text-center text-base text-gray-600">
                    Already have an account?{' '}
                    <button
                        onClick={() => setCurrentPage('login')}
                        className="font-bold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:underline"
                    >
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );

    const renderProductsPage = () => (
        <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
            <header className="sticky top-0 z-40 bg-white shadow-lg py-4 px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row justify-between items-center rounded-b-2xl mb-6">
                <h1 className="text-4xl font-extrabold text-purple-800 mb-4 sm:mb-0">BEE-Commerce</h1>
                <nav className="flex items-center space-x-4 flex-wrap justify-center sm:justify-end">
                    <button
                        onClick={() => { setCurrentPage('products'); setSelectedCategory(null); setCurrentPageNum(1); }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-purple-700 rounded-xl transition duration-200 flex items-center group"
                    >
                        <Home className="w-5 h-5 mr-2 text-gray-600 group-hover:text-purple-700 transition duration-200" />
                        <span className="font-semibold text-base">Home</span>
                    </button>

                    <div className="relative">
                        <select
                            onChange={(e) => {
                                const categoryId = e.target.value === '' ? null : parseInt(e.target.value);
                                setSelectedCategory(categoryId);
                                setCurrentPageNum(1);
                                setCurrentPage('products');
                            }}
                            value={selectedCategory || ''}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition duration-200 hover:border-indigo-400 cursor-pointer"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-700 rounded-xl transition duration-200 flex items-center group"
                    >
                        <ShoppingCart className="w-5 h-5 mr-2 text-gray-600 group-hover:text-blue-700 transition duration-200" />
                        <span className="font-semibold text-base">Cart</span>
                        {totalCartItems > 0 && (
                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2 min-w-[20px] min-h-[20px] text-center">
                                {totalCartItems}
                            </span>
                        )}
                    </button>

                    {accessToken && (
                        <button
                            onClick={() => setCurrentPage('orders')}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-green-700 rounded-xl transition duration-200 flex items-center group"
                        >
                            <Receipt className="w-5 h-5 mr-2 text-gray-600 group-hover:text-green-700 transition duration-200" />
                            <span className="font-semibold text-base">Orders</span>
                        </button>
                    )}

                    {accessToken && (
                        <button
                            onClick={() => setCurrentPage('profile')}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-purple-700 rounded-xl transition duration-200 flex items-center group"
                        >
                            <User className="w-5 h-5 mr-2 text-gray-600 group-hover:text-purple-700 transition duration-200" />
                            <span className="font-semibold text-base">Profile</span>
                        </button>
                    )}

                    {user ? (
                        <>
                            <span className="text-base font-semibold text-gray-700 ml-4 hidden md:block">Hello, {user.username || user.user_id}!</span>
                            <button
                                onClick={handleLogout}
                                className="px-5 py-2 bg-red-600 text-white font-semibold rounded-xl shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-200 transform hover:scale-105 ml-4"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setCurrentPage('login')}
                                className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 transform hover:scale-105"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setCurrentPage('register')}
                                className="px-5 py-2 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 transform hover:scale-105 ml-2"
                            >
                                Register
                            </button>
                        </>
                    )}
                </nav>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-purple-300 pb-2">
                        {selectedCategory ? categories.find(cat => cat.id === selectedCategory)?.name + ' Products' : 'All Products'}
                    </h2>

                    <form onSubmit={handleSearch} className="w-full sm:w-auto">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition duration-200 w-full"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 text-gray-500 hover:text-indigo-600"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        fetchProducts(selectedCategory, '', 1);
                                    }}
                                    className="ml-2 text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
                        <p className="mt-5 text-lg text-gray-600">Loading products...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-5 py-4 rounded-xl relative mb-6 shadow-md" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                        {accessToken && (
                            <button
                                onClick={() => fetchProducts(selectedCategory, searchQuery, currentPageNum)}
                                className="ml-4 text-sm font-medium text-red-700 hover:text-red-900 underline transition duration-200"
                            >
                                Try again
                            </button>
                        )}
                    </div>
                )}

                {!loading && products.length === 0 && !error && (
                    <div className="text-center py-12 text-gray-600">
                        <p className="text-xl">No products found {selectedCategory ? 'for this category' : ''} or you are not logged in to view them.</p>
                        {!accessToken && (
                            <p className="mt-4 text-lg">Please <button onClick={() => setCurrentPage('login')} className="text-indigo-600 hover:text-indigo-800 font-semibold underline">login</button> to see products.</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition duration-300 hover:scale-105 border border-gray-100">
                            <img
                                src={product.image_url || `https://placehold.co/400x250/F8F8F8/333333?text=${product.name.replace(/ /g, '+')}`}
                                alt={product.name}
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x250/F8F8F8/333333?text=${product.name.replace(/ /g, '+')}`; }}
                                className="w-full h-48 object-cover object-center"
                            />
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h3>
                                {product.category_name && (
                                    <p className="text-gray-500 text-sm mb-2">Category: <span className="font-medium text-purple-600">{product.category_name}</span></p>
                                )}
                                <p className="text-gray-700 text-base mb-4 line-clamp-2">{product.description}</p>
                                <p className="text-purple-700 font-extrabold text-2xl mb-5">${parseFloat(product.price).toFixed(2)}</p>
                                <div className="flex justify-between items-center">
                                    <span className={`px-4 py-1 text-sm font-bold rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                                        {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                                    </span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock === 0 || !accessToken}
                                        className="px-5 py-2 bg-blue-600 text-white text-base font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 transform hover:scale-105"
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                        Showing {(currentPageNum - 1) * pageSize + 1} to {Math.min(currentPageNum * pageSize, products.length)} of {products.length} products
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Items per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPageNum(1);
                                fetchProducts(selectedCategory, searchQuery, 1);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                </div>

                {renderPaginationControls()}
            </main>

            {isCartOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4">
                    <div className="relative bg-white p-8 rounded-2xl shadow-3xl w-full max-w-2xl mx-auto border border-gray-200 transform scale-100 opacity-100 transition-all duration-300 ease-in-out">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center border-b pb-4">Your Shopping Cart</h2>
                        <button
                            onClick={() => setIsCartOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition duration-200 rounded-full p-2 hover:bg-gray-100"
                        >
                            <X className="w-7 h-7" />
                        </button>

                        {cartItems.length === 0 ? (
                            <p className="text-center text-gray-600 text-lg py-8">Your cart is empty. Start adding some awesome products!</p>
                        ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center">
                                            <img src={item.image_url || `https://placehold.co/60x60/E5E7EB/4B5563?text=${item.name.charAt(0)}`} alt={item.name} className="w-16 h-16 object-cover rounded-md mr-4 border border-gray-200"/>
                                            <div className="flex-grow">
                                                <h3 className="font-semibold text-lg text-gray-900 leading-tight">{item.name}</h3>
                                                <p className="text-gray-600 text-sm">Unit Price: ${parseFloat(item.price).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                                                className="p-1 border border-gray-300 rounded-full hover:bg-gray-200 transition duration-150 text-gray-700"
                                            >
                                                <Minus className="w-5 h-5" />
                                            </button>
                                            <span className="font-bold text-lg text-gray-800 min-w-[20px] text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                                                className="p-1 border border-gray-300 rounded-full hover:bg-gray-200 transition duration-150 text-gray-700"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1 text-red-600 hover:text-red-800 transition duration-150 ml-2"
                                            >
                                                <Trash2 className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="text-right text-3xl font-extrabold text-purple-800 mt-8 pt-6 border-t border-gray-200">
                            Total: ${totalCartPrice}
                        </div>
                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                onClick={clearCart}
                                disabled={cartItems.length === 0}
                                className="px-6 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear Cart
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={cartItems.length === 0 || loading}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Proceed to Checkout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

 const renderOrdersPage = () => (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-indigo-800">Your Orders</h1>
                <button
                    onClick={() => setCurrentPage('products')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 flex items-center"
                >
                    <span className="w-5 h-5 mr-2">←</span>
                    Back to Products
                </button>
            </div>

            {loading && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mx-auto"></div>
                    <p className="mt-5 text-lg text-gray-600">Loading your orders...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-5 py-4 rounded-xl relative mb-6 shadow-md" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                    <button
                        onClick={fetchOrders}
                        className="ml-4 text-sm font-medium text-red-700 hover:text-red-900 underline transition duration-200"
                    >
                        Try again
                    </button>
                </div>
            )}

            {!loading && orders.length === 0 && !error && (
                <div className="text-center py-12 bg-white rounded-xl shadow-md border border-gray-200">
                    <span className="text-4xl">📦</span>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No orders yet</h3>
                    <p className="mt-1 text-gray-500">You haven't placed any orders yet. Start shopping to see them here!</p>
                    <div className="mt-6">
                        <button
                            onClick={() => setCurrentPage('products')}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Shop Now
                        </button>
                    </div>
                </div>
            )}

            {orders.length > 0 && (
                <div className="space-y-6">
                    {orders.map(order => {
                        // Parse dates
                        const orderDate = order.ordered_at ? new Date(order.ordered_at) : null;
                        const formattedDate = orderDate ? orderDate.toLocaleDateString() : 'Date not available';
                        const formattedTime = orderDate ? orderDate.toLocaleTimeString() : 'Time not available';

                        // Convert to numbers safely
                        const subtotal = typeof order.total_price === 'number' ? order.total_price :
                                       parseFloat(order.total_price) || 0;
                        const shipping = 0; // Add your shipping field if available
                        const total = subtotal + shipping;

                        return (
                            <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                                <div className="p-6 sm:p-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Order #{order.id}</h3>
                                            <p className="text-sm text-gray-500">
                                                Placed on {formattedDate} at {formattedTime}
                                            </p>
                                        </div>
                                        <div className="mt-2 sm:mt-0">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {order.status_display || order.status || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 mt-4 pt-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                                        {order.items && order.items.length > 0 ? (
                                            <div className="space-y-4">
                                                {order.items.map(item => {
                                                    // Convert to numbers safely
                                                    const price = typeof item.price === 'number' ? item.price :
                                                                parseFloat(item.price) || 0;
                                                    const quantity = typeof item.quantity === 'number' ? item.quantity :
                                                                    parseInt(item.quantity) || 1;
                                                    const itemTotal = price * quantity;

                                                    return (
                                                        <div key={item.id} className="flex items-start">
                                                            <img
                                                                src={item.product?.image || `https://placehold.co/80x80/E5E7EB/4B5563?text=${item.product?.name?.charAt(0) || '?'}`}
                                                                alt={item.product?.name || 'Product'}
                                                                className="w-16 h-16 object-cover rounded-md mr-4 border border-gray-200"
                                                            />
                                                            <div className="flex-grow">
                                                                <h5 className="font-medium text-gray-900">
                                                                    {item.product?.name || 'Unnamed Product'}
                                                                </h5>
                                                                <p className="text-sm text-gray-500">
                                                                    Quantity: {quantity}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-semibold text-gray-900">
                                                                    ${price.toFixed(2)}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    ${itemTotal.toFixed(2)} total
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">No items in this order</p>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Status: <span className="font-medium text-gray-900">
                                                    {order.status_display || order.status || 'Unknown'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">
                                                Subtotal: ${subtotal.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Shipping: ${shipping.toFixed(2)}
                                            </p>
                                            <p className="text-lg font-bold text-gray-900 mt-1">
                                                Total: ${total.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
);

    const renderProfilePage = () => (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 font-sans antialiased text-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-extrabold text-indigo-800">Your Profile</h1>
                    <button
                        onClick={() => setCurrentPage('products')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 flex items-center"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Products
                    </button>
                </div>

                {loading && !profileData && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mx-auto"></div>
                        <p className="mt-5 text-lg text-gray-600">Loading your profile...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-5 py-4 rounded-xl relative mb-6 shadow-md" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                        <button
                            onClick={fetchProfile}
                            className="ml-4 text-sm font-medium text-red-700 hover:text-red-900 underline transition duration-200"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {profileData && (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                        <div className="p-6 sm:p-8">
                            {!isEditingProfile ? (
                                <div>
                                    <div className="flex items-center mb-6">
                                        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold mr-6">
                                            {profileData.username ? profileData.username.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{profileData.username}</h2>
                                            <p className="text-gray-600">{profileData.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500">First Name</h3>
                                            <p className="mt-1 text-lg text-gray-900">{profileData.first_name || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500">Last Name</h3>
                                            <p className="mt-1 text-lg text-gray-900">{profileData.last_name || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500">Account Created</h3>
                                            <p className="mt-1 text-lg text-gray-900">
                                                {new Date(profileData.date_joined).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
                                            <p className="mt-1 text-lg text-gray-900">
                                                {profileData.last_login ? new Date(profileData.last_login).toLocaleString() : 'Never'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex space-x-4 mt-8">
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
                                        >
                                            Edit Profile
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleProfileUpdate}>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                                Username
                                            </label>
                                            <input
                                                type="text"
                                                id="username"
                                                value={profileEditForm.username}
                                                onChange={(e) => setProfileEditForm({...profileEditForm, username: e.target.value})}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                value={profileEditForm.email}
                                                onChange={(e) => setProfileEditForm({...profileEditForm, email: e.target.value})}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                id="first_name"
                                                value={profileEditForm.first_name}
                                                onChange={(e) => setProfileEditForm({...profileEditForm, first_name: e.target.value})}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                id="last_name"
                                                value={profileEditForm.last_name}
                                                onChange={(e) => setProfileEditForm({...profileEditForm, last_name: e.target.value})}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative mb-6" role="alert">
                                            <strong className="font-bold">Error!</strong>
                                            <span className="block sm:inline ml-2">{error}</span>
                                        </div>
                                    )}

                                    <div className="flex space-x-4 mt-8">
                                        <button
                                            type="submit"
                                             disabled={loading}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
                                        >
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingProfile(false);
                                                setError(null);
                                            }}
                                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="font-sans antialiased text-gray-900">
            <script src="https://cdn.tailwindcss.com"></script>
            {currentPage === 'login' && renderLoginForm()}
            {currentPage === 'register' && renderRegisterForm()}
            {currentPage === 'products' && renderProductsPage()}
            {currentPage === 'orders' && renderOrdersPage()}
            {currentPage === 'profile' && renderProfilePage()}
        </div>
    );
}

export default App;