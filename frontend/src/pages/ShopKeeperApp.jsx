import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Package, ShoppingCart, Plus, Minus, X, Phone, User, Search,
  Check, LogIn, LogOut, Clock, Store, Printer, Receipt, Barcode,
  CreditCard, Banknote, Smartphone, Users, AlertTriangle, TrendingUp,
  ArrowLeft, ChevronRight, RefreshCw, Calendar, Trash2
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// ShopKeeper Context
const ShopKeeperContext = createContext();

function useShopKeeper() {
  return useContext(ShopKeeperContext);
}

// Main ShopKeeper App Component
export default function ShopKeeperApp() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('shopkeeperToken'));
  const [view, setView] = useState(token ? 'pos' : 'login');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.data);
      setView('pos');
    } catch (error) {
      localStorage.removeItem('shopkeeperToken');
      setToken(null);
      setView('login');
    }
  };

  const login = (newToken, userData) => {
    localStorage.setItem('shopkeeperToken', newToken);
    setToken(newToken);
    setUser(userData);
    setView('pos');
    toast.success(`Welcome, ${userData.full_name}!`);
  };

  const logout = () => {
    localStorage.removeItem('shopkeeperToken');
    setToken(null);
    setUser(null);
    setCart([]);
    setView('login');
    toast.success('Logged out successfully');
  };

  const value = {
    user, token, login, logout, cart, setCart,
    selectedCustomer, setSelectedCustomer, view, setView
  };

  return (
    <ShopKeeperContext.Provider value={value}>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-center" />

        {view === 'login' && <LoginScreen />}
        {view === 'pos' && <POSScreen />}
        {view === 'orders' && <OnlineOrdersScreen />}
        {view === 'stock' && <StockScreen />}
        {view === 'summary' && <DailySummaryScreen />}
      </div>
    </ShopKeeperContext.Provider>
  );
}

// Login Screen for ShopKeeper
function LoginScreen() {
  const { login } = useShopKeeper();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const userData = response.data.data;

      // Only allow cashier and manager roles
      if (!['cashier', 'manager', 'admin'].includes(userData.role)) {
        toast.error('Access denied. This app is for store staff only.');
        setLoading(false);
        return;
      }

      login(response.data.token, userData);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/images/bharathiyar.png"
            alt="Bharathi Medicals"
            className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 items-center justify-center text-white text-4xl mx-auto mb-4 shadow-lg hidden">
            🐾
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Bharathi Medicals</h1>
          <p className="text-gray-500 mt-1">Vet & Pet Shop - Staff Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your username"
              required
            />
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

        <p className="text-center text-sm text-gray-500 mt-6">
          For store staff use only
        </p>
      </div>
    </div>
  );
}

// POS Screen - Main billing interface
function POSScreen() {
  const { user, token, logout, cart, setCart, setView, selectedCustomer, setSelectedCustomer } = useShopKeeper();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/online/categories`)
      ]);
      setProducts(productsRes.data.data || []);
      setCategories(categoriesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    if (!query) {
      setCustomers([]);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/customers/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Customer search error');
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.barcode === barcodeInput || p.sku === barcodeInput);
    if (product) {
      addToCart(product);
    } else {
      toast.error('Product not found');
    }
    setBarcodeInput('');
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.selling_price,
        mrp: product.mrp,
        gst_rate: product.gst_rate,
        quantity: 1
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gstAmount = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + (itemTotal * (item.gst_rate / 100));
  }, 0);
  const discountAmount = discount > 0 ? (discount > 100 ? discount : (subtotal * discount / 100)) : 0;
  const grandTotal = subtotal + gstAmount - discountAmount;

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery);
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory && p.is_active;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await axios.post(`${API_URL}/sales`, {
        branch_id: user.branch_id,
        customer_id: selectedCustomer?.id || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          gst_rate: item.gst_rate
        })),
        discount: discountAmount,
        discount_type: discount > 100 ? 'amount' : 'percentage',
        payment_method: paymentMethod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLastSale(response.data.data);
      toast.success(`Sale completed! Invoice: ${response.data.data.invoice_number}`);

      // Reset for next sale
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setShowCheckout(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/images/bharathiyar.png"
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.className = 'hidden'; }}
              />
              <div>
                <h1 className="font-bold text-gray-800">Bharathi Medicals</h1>
                <p className="text-xs text-gray-500">Vet & Pet Shop - POS</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
              <Store size={14} />
              <span>{user?.branch_name || 'Branch'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('orders')}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
            >
              <Package size={16} />
              <span className="hidden sm:inline">Online Orders</span>
            </button>
            <button
              onClick={() => setView('stock')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
            >
              <Package size={16} />
              <span className="hidden sm:inline">Stock</span>
            </button>
            <button
              onClick={() => setView('summary')}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
            >
              <TrendingUp size={16} />
              <span className="hidden sm:inline">Summary</span>
            </button>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden lg:inline text-gray-700">{user?.full_name}</span>
            </div>
            <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Search and Barcode */}
          <div className="p-4 bg-white border-b">
            <div className="flex gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1">
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Scan barcode or enter SKU..."
                    autoFocus
                  />
                </div>
              </form>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Search products..."
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="p-3 bg-white border-b overflow-x-auto">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
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

          {/* Products Grid */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl p-3 text-left hover:shadow-lg transition-all hover:scale-[1.02] border border-gray-100"
                  >
                    <div className="text-2xl mb-2">🐾</div>
                    <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">{product.sku}</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(product.selling_price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l flex flex-col">
          {/* Customer Selection */}
          <div className="p-4 border-b">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
            >
              <Users size={18} />
              {selectedCustomer ? (
                <div className="text-left">
                  <p className="font-medium text-gray-800">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                </div>
              ) : (
                <span>Select Customer (Optional)</span>
              )}
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Cart is empty</p>
                <p className="text-sm text-gray-400">Add products to start billing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product_id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 p-1 hover:bg-red-100 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="font-bold text-green-600">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t p-4 bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Quick Discount */}
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Discount (%)"
              />
              {[5, 10].map(d => (
                <button
                  key={d}
                  onClick={() => setDiscount(d)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    discount === d ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {d}%
                </button>
              ))}
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: 'cash', icon: Banknote, label: 'Cash' },
                { id: 'upi', icon: Smartphone, label: 'UPI' },
                { id: 'card', icon: CreditCard, label: 'Card' }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                    paymentMethod === method.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <method.icon size={20} />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processingPayment}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingPayment ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Receipt size={24} />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Search Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Select Customer</h2>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  searchCustomers(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Search by name or phone..."
                autoFocus
              />
              <div className="mt-4 max-h-64 overflow-auto">
                {customers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    {customerSearch ? 'No customers found' : 'Enter name or phone to search'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerModal(false);
                          setCustomerSearch('');
                          setCustomers([]);
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 rounded-lg flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="text-green-600" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerModal(false);
                  }}
                  className="w-full mt-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Remove Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last Sale Receipt Modal */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-4 border-b text-center">
              <Check className="mx-auto text-green-600 mb-2" size={48} />
              <h2 className="font-bold text-xl text-gray-800">Sale Complete!</h2>
            </div>
            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice</span>
                  <span className="font-mono font-bold text-green-600">{lastSale.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-xl">{formatCurrency(lastSale.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="capitalize">{lastSale.payment_method}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  // Print receipt logic
                  window.print();
                }}
                className="flex-1 py-3 border border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50 flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print
              </button>
              <button
                onClick={() => setLastSale(null)}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Online Orders Screen for ShopKeeper
function OnlineOrdersScreen() {
  const { user, token, setView } = useShopKeeper();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('pending');

  useEffect(() => {
    fetchOrders();
  }, [activeStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/online/orders?branch_id=${user.branch_id}&status=${activeStatus}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.data || []);
    } catch (error) {
      // If endpoint doesn't exist, show empty
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/online/orders/${orderId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      ready: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('pos')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Online Orders</h1>
            <button onClick={fetchOrders} className="ml-auto p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {['pending', 'confirmed', 'processing', 'ready', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
                activeStatus === status
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No {activeStatus} orders</h2>
            <p className="text-gray-500">Check other tabs for more orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-green-600">{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="border-t border-b py-3 my-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <User size={16} />
                    <span>{order.customer_name}</span>
                    <span className="text-gray-400">•</span>
                    <Phone size={14} />
                    <span>{order.customer_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded ${order.delivery_type === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {order.delivery_type === 'delivery' ? 'Home Delivery' : 'Store Pickup'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${order.payment_method === 'cash' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                      {order.payment_method === 'cash' ? 'Cash' : 'Paid Online'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">{formatCurrency(order.grand_total)}</p>

                  {order.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'processing')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                      Start Processing
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
                    >
                      Complete Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Stock Screen for ShopKeeper
function StockScreen() {
  const { user, token, setView } = useShopKeeper();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, low, expiring

  useEffect(() => {
    fetchStock();
  }, [filter]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      let endpoint = `${API_URL}/stock?branch_id=${user.branch_id}`;
      if (filter === 'low') {
        endpoint = `${API_URL}/stock/low-stock?branch_id=${user.branch_id}`;
      } else if (filter === 'expiring') {
        endpoint = `${API_URL}/stock/expiring?branch_id=${user.branch_id}`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(response.data.data || []);
    } catch (error) {
      setStock([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('pos')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Branch Stock</h1>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2">
          {[
            { id: 'all', label: 'All Stock' },
            { id: 'low', label: 'Low Stock', icon: AlertTriangle },
            { id: 'expiring', label: 'Expiring Soon', icon: Clock }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                filter === item.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.icon && <item.icon size={16} />}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : stock.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No stock found</h2>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stock.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        item.quantity <= item.min_stock
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {item.batch_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.expiry_date ? (
                        <span className={`text-sm ${
                          new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'text-red-600 font-medium'
                            : 'text-gray-600'
                        }`}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// Daily Summary Screen for ShopKeeper
function DailySummaryScreen() {
  const { user, token, setView } = useShopKeeper();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/reports/daily-summary?branch_id=${user.branch_id}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(response.data.data);
    } catch (error) {
      setSummary({
        total_sales: 0,
        total_transactions: 0,
        cash_sales: 0,
        upi_sales: 0,
        card_sales: 0,
        top_products: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('pos')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-800">Daily Summary</h1>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Sales Card */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
              <p className="text-green-100 text-sm">Total Sales</p>
              <p className="text-4xl font-bold">{formatCurrency(summary?.total_sales || 0)}</p>
              <p className="text-green-100 mt-2">{summary?.total_transactions || 0} transactions</p>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-white rounded-xl p-4">
              <h2 className="font-semibold text-gray-800 mb-4">Payment Methods</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Banknote className="mx-auto text-green-600 mb-2" size={24} />
                  <p className="text-xs text-gray-500">Cash</p>
                  <p className="font-bold text-green-600">{formatCurrency(summary?.cash_sales || 0)}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Smartphone className="mx-auto text-purple-600 mb-2" size={24} />
                  <p className="text-xs text-gray-500">UPI</p>
                  <p className="font-bold text-purple-600">{formatCurrency(summary?.upi_sales || 0)}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <CreditCard className="mx-auto text-blue-600 mb-2" size={24} />
                  <p className="text-xs text-gray-500">Card</p>
                  <p className="font-bold text-blue-600">{formatCurrency(summary?.card_sales || 0)}</p>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl p-4">
              <h2 className="font-semibold text-gray-800 mb-4">Top Selling Products</h2>
              {summary?.top_products?.length > 0 ? (
                <div className="space-y-3">
                  {summary.top_products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.quantity_sold} units sold</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-600">{formatCurrency(product.total_amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No sales data available</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
