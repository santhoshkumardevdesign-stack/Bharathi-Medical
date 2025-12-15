import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  MapPin, ShoppingCart, Plus, Minus, X, Phone, User, Home, Search,
  Check, LogIn, UserPlus, LogOut, Clock, Package, Truck, Store,
  CreditCard, Banknote, ChevronRight, ArrowLeft, Heart, History,
  Shield, Star, Filter
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Customer Auth Context
const CustomerContext = createContext();

function useCustomer() {
  return useContext(CustomerContext);
}

// Main Customer App Component
export default function CustomerApp() {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('customerToken'));
  const [view, setView] = useState('home'); // home, login, register, shop, cart, checkout, orders, profile, confirmation
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(null);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomer(response.data.data);
    } catch (error) {
      localStorage.removeItem('customerToken');
      setToken(null);
    }
  };

  const login = (newToken, customerData) => {
    localStorage.setItem('customerToken', newToken);
    setToken(newToken);
    setCustomer(customerData);
    setView('home');
    toast.success(`Welcome back, ${customerData.name}!`);
  };

  const logout = () => {
    localStorage.removeItem('customerToken');
    setToken(null);
    setCustomer(null);
    setCart([]);
    setView('home');
    toast.success('Logged out successfully');
  };

  const value = {
    customer, token, login, logout, cart, setCart,
    selectedBranch, setSelectedBranch, view, setView,
    orderPlaced, setOrderPlaced
  };

  return (
    <CustomerContext.Provider value={value}>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />

        {view === 'home' && <HomeScreen />}
        {view === 'login' && <LoginScreen />}
        {view === 'register' && <RegisterScreen />}
        {view === 'shop' && <ShopScreen />}
        {view === 'cart' && <CartScreen />}
        {view === 'checkout' && <CheckoutScreen />}
        {view === 'orders' && <OrdersScreen />}
        {view === 'profile' && <ProfileScreen />}
        {view === 'confirmation' && <ConfirmationScreen />}
      </div>
    </CustomerContext.Provider>
  );
}

// Home Screen with Branch Selection
function HomeScreen() {
  const { customer, setView, setSelectedBranch, cart } = useCustomer();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API_URL}/online/branches`);
      setBranches(response.data.data);
    } catch (error) {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = (branch) => {
    setSelectedBranch(branch);
    setView('shop');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/images/bharathiyar.png"
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-lg"
                onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl shadow-lg">🐾</div>'; }}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Bharathi Medicals</h1>
                <p className="text-xs text-gray-500">Vet & Pet Shop</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={() => setView('cart')}
                  className="relative p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <ShoppingCart size={20} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </button>
              )}
              {customer ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView('orders')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="My Orders"
                  >
                    <History size={20} />
                  </button>
                  <button
                    onClick={() => setView('profile')}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <User size={18} />
                    <span className="hidden sm:inline">{customer.name.split(' ')[0]}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setView('login')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Order Pet Supplies Online</h2>
          <p className="text-green-100 text-lg">Get pet food, medicines & accessories delivered or pick up from store</p>
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Truck size={20} />
              <span>Home Delivery</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Store size={20} />
              <span>Store Pickup</span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Selection */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Select Your Nearest Store</h3>
          <p className="text-gray-600">Choose a branch to browse available pet products</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => selectBranch(branch)}
                className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-green-500 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                    <MapPin className="text-green-600" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 mb-1">{branch.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{branch.address}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{branch.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-green-600">
                      <Clock size={12} />
                      <span>{branch.opening_hours}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-green-600 transition-colors" size={20} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Features Section */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">Why Choose Us?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-green-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">100% Genuine</h4>
              <p className="text-sm text-gray-500">Quality pet products</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Truck className="text-green-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">Fast Delivery</h4>
              <p className="text-sm text-gray-500">Same day delivery</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="text-green-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">Best Prices</h4>
              <p className="text-sm text-gray-500">Competitive rates</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="text-green-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">Trusted Care</h4>
              <p className="text-sm text-gray-500">Since 1985</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Login Screen
function LoginScreen() {
  const { login, setView } = useCustomer();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/customer/login`, { phone, password });
      login(response.data.data.token, response.data.data.customer);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="text-center mb-8">
          <img
            src="/images/bharathiyar.png"
            alt="Logo"
            className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg object-cover"
            onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">🐾</div>'; }}
          />
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-500">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={18} />
                Login
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button onClick={() => setView('register')} className="text-green-600 font-semibold hover:underline">
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Register Screen
function RegisterScreen() {
  const { login, setView } = useCustomer();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/customer/register`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        address: formData.address
      });
      login(response.data.data.token, response.data.data.customer);
      toast.success('Registration successful!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
            🐾
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500">Join Bharathi Medicals</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Re-enter password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Your delivery address"
              rows="2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus size={18} />
                Register
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button onClick={() => setView('login')} className="text-green-600 font-semibold hover:underline">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Shop Screen with Category Navigation
function ShopScreen() {
  const { selectedBranch, setView, cart, setCart, customer } = useCustomer();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/online/categories`);
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await axios.get(`${API_URL}/online/products/${selectedBranch.id}`, { params });
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity < product.available_stock) {
        setCart(cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
        toast.success('Quantity updated');
      } else {
        toast.error('Maximum stock reached');
      }
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.selling_price,
        mrp: product.mrp,
        quantity: 1,
        max_stock: product.available_stock,
        category: product.category_name,
        icon: product.category_icon
      }]);
      toast.success(`${product.name} added to cart`);
    }
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.max_stock) {
          toast.error('Maximum stock reached');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const cat = product.category_name || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('home')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-bold text-gray-800">Bharathi Medicals</h1>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <MapPin size={12} />
                  {selectedBranch.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {customer && (
                <button onClick={() => setView('orders')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <History size={20} />
                </button>
              )}
              <button
                onClick={() => cart.length > 0 && setView('cart')}
                className="relative p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search pet products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="bg-white border-b sticky top-28 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : selectedCategory ? (
          // Grid view for single category
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product_id === product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartItem={cartItem}
                  onAdd={() => addToCart(product)}
                  onUpdateQty={(delta) => updateCartQuantity(product.id, delta)}
                  formatCurrency={formatCurrency}
                />
              );
            })}
          </div>
        ) : (
          // Category-wise view
          <div className="space-y-8">
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span>{categoryProducts[0]?.category_icon || '📦'}</span>
                    {category}
                  </h2>
                  <button
                    onClick={() => setSelectedCategory(categories.find(c => c.name === category)?.id)}
                    className="text-green-600 text-sm font-medium hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {categoryProducts.slice(0, 5).map(product => {
                    const cartItem = cart.find(item => item.product_id === product.id);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        cartItem={cartItem}
                        onAdd={() => addToCart(product)}
                        onUpdateQty={(delta) => updateCartQuantity(product.id, delta)}
                        formatCurrency={formatCurrency}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{cartCount} items</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(cartTotal)}</p>
            </div>
            <button
              onClick={() => setView('cart')}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <ShoppingCart size={20} />
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, cartItem, onAdd, onUpdateQty, formatCurrency }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{product.category_icon || '🐾'}</span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          {product.available_stock} left
        </span>
      </div>
      <h3 className="font-medium text-gray-800 text-sm mb-1 line-clamp-2">{product.name}</h3>
      <p className="text-xs text-gray-400 mb-2">{product.unit}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(product.selling_price)}</p>
          {product.mrp > product.selling_price && (
            <p className="text-xs text-gray-400 line-through">{formatCurrency(product.mrp)}</p>
          )}
        </div>
        {cartItem ? (
          <div className="flex items-center gap-1 bg-green-50 rounded-lg p-1">
            <button
              onClick={() => onUpdateQty(-1)}
              className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold text-sm">{cartItem.quantity}</span>
            <button
              onClick={() => onUpdateQty(1)}
              className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50"
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}

// Cart Screen
function CartScreen() {
  const { cart, setCart, setView, selectedBranch, customer } = useCustomer();

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.max_stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeItem = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
    toast.success('Item removed');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const savings = cart.reduce((sum, item) => sum + ((item.mrp - item.price) * item.quantity), 0);

  const proceedToCheckout = () => {
    if (!customer) {
      toast.error('Please login to continue');
      setView('login');
      return;
    }
    setView('checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('shop')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Your Cart</h1>
            <span className="text-sm text-gray-500">({cart.length} items)</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add pet products to get started</p>
            <button
              onClick={() => setView('shop')}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Store Info */}
            <div className="bg-white rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Store className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">{selectedBranch.name}</p>
                <p className="text-xs text-gray-500">{selectedBranch.address}</p>
              </div>
            </div>

            {/* Cart Items */}
            <div className="bg-white rounded-xl divide-y">
              {cart.map(item => (
                <div key={item.product_id} className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {item.icon || '🐾'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-green-600">{formatCurrency(item.price)}</span>
                      {item.mrp > item.price && (
                        <span className="text-xs text-gray-400 line-through">{formatCurrency(item.mrp)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeItem(item.product_id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      <X size={16} />
                    </button>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Total Savings</span>
                    <span>-{formatCurrency(savings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>GST & Delivery</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Checkout Footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(subtotal)}</p>
              </div>
              {savings > 0 && (
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm">
                  Saving {formatCurrency(savings)}
                </div>
              )}
            </div>
            <button
              onClick={proceedToCheckout}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              {customer ? 'Proceed to Checkout' : 'Login to Checkout'}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Checkout Screen with Delivery Options
function CheckoutScreen() {
  const { cart, setCart, setView, selectedBranch, customer, token, setOrderPlaced } = useCustomer();
  const [deliveryType, setDeliveryType] = useState('pickup'); // 'pickup' or 'delivery'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'online'
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCharge = deliveryType === 'delivery' ? 30 : 0;
  const gstEstimate = subtotal * 0.05; // Approximate GST
  const grandTotal = subtotal + gstEstimate + deliveryCharge;

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async (orderId, orderData) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error('Failed to load payment gateway');
      return false;
    }

    try {
      // Create Razorpay order
      const paymentResponse = await axios.post(`${API_URL}/payments/create-order`, {
        amount: grandTotal,
        order_id: orderId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { order_id: razorpayOrderId, amount, key_id } = paymentResponse.data.data;

      return new Promise((resolve) => {
        const options = {
          key: key_id,
          amount: amount,
          currency: 'INR',
          name: 'Bharathi Medicals',
          description: `Order #${orderData.order_number}`,
          order_id: razorpayOrderId,
          handler: async function (response) {
            try {
              // Verify payment
              await axios.post(`${API_URL}/payments/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: orderId
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              resolve(true);
            } catch (error) {
              toast.error('Payment verification failed');
              resolve(false);
            }
          },
          prefill: {
            name: customer.name,
            contact: customer.phone,
            email: customer.email || ''
          },
          theme: {
            color: '#16a34a'
          },
          modal: {
            ondismiss: function() {
              resolve(false);
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment initialization failed');
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    setLoading(true);
    try {
      // Create order first
      const response = await axios.post(`${API_URL}/online/order`, {
        branch_id: selectedBranch.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        customer_id: customer.id,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'delivery' ? deliveryAddress : '',
        payment_method: paymentMethod,
        notes
      });

      const orderData = response.data.data;

      // If online payment, process Razorpay
      if (paymentMethod === 'online') {
        const paymentSuccess = await handleRazorpayPayment(orderData.id, orderData);
        if (!paymentSuccess) {
          toast.error('Payment cancelled. Your order is saved but payment is pending.');
          setOrderPlaced({ ...orderData, payment_status: 'pending' });
          setCart([]);
          setView('confirmation');
          return;
        }
        orderData.payment_status = 'paid';
      }

      setOrderPlaced(orderData);
      setCart([]);
      setView('confirmation');
      toast.success('Order placed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('cart')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Checkout</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Delivery Options */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Truck size={20} className="text-green-600" />
            Delivery Option
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryType('pickup')}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === 'pickup'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Store className={`mx-auto mb-2 ${deliveryType === 'pickup' ? 'text-green-600' : 'text-gray-400'}`} size={28} />
              <p className={`font-semibold ${deliveryType === 'pickup' ? 'text-green-700' : 'text-gray-700'}`}>Store Pickup</p>
              <p className="text-xs text-gray-500 mt-1">Free</p>
            </button>
            <button
              onClick={() => setDeliveryType('delivery')}
              className={`p-4 rounded-xl border-2 transition-all ${
                deliveryType === 'delivery'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Truck className={`mx-auto mb-2 ${deliveryType === 'delivery' ? 'text-green-600' : 'text-gray-400'}`} size={28} />
              <p className={`font-semibold ${deliveryType === 'delivery' ? 'text-green-700' : 'text-gray-700'}`}>Home Delivery</p>
              <p className="text-xs text-gray-500 mt-1">₹30 charge</p>
            </button>
          </div>

          {deliveryType === 'pickup' ? (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-start gap-3">
              <MapPin className="text-green-600 mt-0.5" size={18} />
              <div>
                <p className="font-medium text-gray-800">{selectedBranch.name}</p>
                <p className="text-sm text-gray-500">{selectedBranch.address}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedBranch.phone}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your complete delivery address"
                rows="3"
                required
              />
            </div>
          )}
        </div>

        {/* Payment Options */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-green-600" />
            Payment Method
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Banknote className={`mx-auto mb-2 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} size={28} />
              <p className={`font-semibold ${paymentMethod === 'cash' ? 'text-green-700' : 'text-gray-700'}`}>
                {deliveryType === 'pickup' ? 'Cash at Store' : 'Cash on Delivery'}
              </p>
            </button>
            <button
              onClick={() => setPaymentMethod('online')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'online'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className={`mx-auto mb-2 ${paymentMethod === 'online' ? 'text-green-600' : 'text-gray-400'}`} size={28} />
              <p className={`font-semibold ${paymentMethod === 'online' ? 'text-green-700' : 'text-gray-700'}`}>Pay Online</p>
              <p className="text-xs text-gray-500 mt-1">GPay / Paytm / UPI / Card</p>
            </button>
          </div>
        </div>

        {/* Order Notes */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Special Instructions (Optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Any special requests or instructions..."
            rows="2"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Order Summary</h2>
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.product_id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} × {item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST (Approx.)</span>
                <span>{formatCurrency(gstEstimate)}</span>
              </div>
              {deliveryCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Charge</span>
                  <span>{formatCurrency(deliveryCharge)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Place Order Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Check size={20} />
                Place Order - {formatCurrency(grandTotal)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Order Confirmation Screen
function ConfirmationScreen() {
  const { orderPlaced, setView, setOrderPlaced } = useCustomer();

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  if (!orderPlaced) {
    setView('home');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-600" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h1>
        <p className="text-gray-600 mb-6">Thank you for your order</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Order Number</span>
            <span className="font-mono font-bold text-green-600">{orderPlaced.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              {orderPlaced.delivery_type === 'delivery' ? 'Delivery To' : 'Pickup From'}
            </span>
            <span className="font-medium text-right max-w-[60%]">
              {orderPlaced.delivery_type === 'delivery' ? orderPlaced.delivery_address : orderPlaced.branch}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium capitalize">{orderPlaced.payment_method}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(orderPlaced.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST</span>
              <span>{formatCurrency(orderPlaced.gst_amount)}</span>
            </div>
            {orderPlaced.delivery_charge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery</span>
                <span>{formatCurrency(orderPlaced.delivery_charge)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total</span>
              <span className="text-green-600">{formatCurrency(orderPlaced.grand_total)}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-4 mb-6 text-left ${
          orderPlaced.delivery_type === 'delivery' ? 'bg-blue-50' : 'bg-yellow-50'
        }`}>
          <p className={`text-sm ${orderPlaced.delivery_type === 'delivery' ? 'text-blue-800' : 'text-yellow-800'}`}>
            {orderPlaced.delivery_type === 'delivery' ? (
              <>
                <Truck size={16} className="inline mr-2" />
                <strong>Delivery:</strong> Your order will be delivered within 30-60 minutes. You will receive a call when it's on the way.
              </>
            ) : (
              <>
                <Store size={16} className="inline mr-2" />
                <strong>Pickup:</strong> Please visit {orderPlaced.branch} to collect your order. You will receive a call when it's ready.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setView('orders')}
            className="flex-1 py-3 border-2 border-green-600 text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-colors"
          >
            View Orders
          </button>
          <button
            onClick={() => {
              setOrderPlaced(null);
              setView('home');
            }}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

// Orders History Screen
function OrdersScreen() {
  const { setView, token } = useCustomer();
  const [orders, setOrders] = useState({ online_orders: [], in_store_orders: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('online');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/customer/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      ready: 'bg-green-100 text-green-700',
      out_for_delivery: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">My Orders</h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-14">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('online')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'online'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Online Orders
            </button>
            <button
              onClick={() => setActiveTab('instore')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'instore'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Store Purchases
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'online' ? (
          orders.online_orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto text-gray-300 mb-4" size={64} />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Online Orders</h2>
              <p className="text-gray-500 mb-6">Place your first order today!</p>
              <button
                onClick={() => setView('home')}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
              >
                Order Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.online_orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-green-600">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <p className="flex items-center gap-2">
                      <MapPin size={14} />
                      {order.branch_name}
                    </p>
                    <p className="flex items-center gap-2 mt-1">
                      {order.delivery_type === 'delivery' ? <Truck size={14} /> : <Store size={14} />}
                      {order.delivery_type === 'delivery' ? 'Home Delivery' : 'Store Pickup'}
                    </p>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {order.items?.length || 0} items
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(order.grand_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          orders.in_store_orders.length === 0 ? (
            <div className="text-center py-16">
              <Store className="mx-auto text-gray-300 mb-4" size={64} />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Store Purchases</h2>
              <p className="text-gray-500">Visit any of our stores to make a purchase</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.in_store_orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-green-600">{order.invoice_number}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Completed
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <p className="flex items-center gap-2">
                      <Store size={14} />
                      {order.branch_name}
                    </p>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      In-store purchase
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(order.grand_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}

// Profile Screen
function ProfileScreen() {
  const { customer, logout, setView, token } = useCustomer();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    address: customer?.address || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/customer/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Profile updated');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Card */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              {customer?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{customer?.name}</h2>
              <p className="text-green-100">{customer?.phone}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100">Loyalty Points</p>
              <p className="text-2xl font-bold">{customer?.loyalty_points || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-100">Member Since</p>
              <p className="font-medium">
                {new Date(customer?.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Profile Details</h3>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-green-600 text-sm font-medium hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <User size={18} className="text-gray-400" />
                <span>{customer?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone size={18} className="text-gray-400" />
                <span>{customer?.phone}</span>
              </div>
              {customer?.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="text-gray-400">@</span>
                  <span>{customer.email}</span>
                </div>
              )}
              {customer?.address && (
                <div className="flex items-start gap-3 text-gray-600">
                  <Home size={18} className="text-gray-400 mt-0.5" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl divide-y">
          <button
            onClick={() => setView('orders')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Package className="text-green-600" size={20} />
              <span className="font-medium text-gray-800">My Orders</span>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full p-4 bg-white rounded-xl flex items-center justify-center gap-2 text-red-600 font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </main>
    </div>
  );
}
