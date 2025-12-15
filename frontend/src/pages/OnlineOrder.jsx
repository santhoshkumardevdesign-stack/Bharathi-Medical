import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { MapPin, ShoppingCart, Plus, Minus, X, Phone, User, Home, Search, Check } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/online';

export default function OnlineOrder() {
  const [step, setStep] = useState(1); // 1: Select Branch, 2: Browse & Add, 3: Checkout
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchProducts();
    }
  }, [selectedBranch, selectedCategory]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API_URL}/branches`);
      setBranches(response.data.data);
    } catch (error) {
      toast.error('Failed to load branches');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await axios.get(`${API_URL}/products/${selectedBranch.id}`, { params });
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
      } else {
        toast.error('Cannot add more than available stock');
      }
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.selling_price,
        quantity: 1,
        max_stock: product.available_stock
      }]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.max_stock) {
          toast.error('Cannot exceed available stock');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const formatCurrency = (amount) => `Rs.${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Please enter your name and phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/order`, {
        branch_id: selectedBranch.id,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        notes: customerInfo.notes
      });

      setOrderPlaced(response.data.data);
      setStep(4);
      setCart([]);
      toast.success('Order placed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Step 1: Branch Selection
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Toaster position="top-center" />

        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl shadow-lg">
                💊
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Bharathi Medicals</h1>
                <p className="text-sm text-gray-500">Online Medicine Order</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Select Your Nearest Branch</h2>
            <p className="text-gray-600">Choose a branch to browse available medicines and place your order</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => { setSelectedBranch(branch); setStep(2); }}
                className="bg-white rounded-2xl shadow-md p-6 text-left hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-green-500"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{branch.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{branch.address}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{branch.phone}</span>
                    </div>
                    <p className="text-xs text-green-600 mt-2">{branch.opening_hours}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Step 2: Browse Products
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />

        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
                <div>
                  <h1 className="font-bold text-gray-800">Bharathi Medicals</h1>
                  <p className="text-xs text-gray-500">{selectedBranch.name}</p>
                </div>
              </div>
              <button
                onClick={() => cart.length > 0 && setStep(3)}
                className="relative p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Search and Filter */}
        <div className="bg-white border-b sticky top-14 z-30">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const cartItem = cart.find(item => item.product_id === product.id);
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-3xl">{product.category_icon || '💊'}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {product.available_stock} in stock
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{product.category_name}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(product.selling_price)}</p>
                        {product.mrp !== product.selling_price && (
                          <p className="text-xs text-gray-400 line-through">{formatCurrency(product.mrp)}</p>
                        )}
                      </div>
                      {cartItem ? (
                        <div className="flex items-center gap-2 bg-green-50 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <Plus size={16} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Cart Summary Footer */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(getCartTotal())}</p>
              </div>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 3: Checkout
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />

        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
              <h1 className="font-bold text-gray-800">Checkout</h1>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.product_id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-gray-800">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 flex items-center justify-between">
              <span className="text-gray-600">Total (excl. GST)</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(getCartTotal())}</span>
            </div>
          </div>

          {/* Pickup Location */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h2 className="font-semibold text-gray-800 mb-2">Pickup Location</h2>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <MapPin className="text-green-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-800">{selectedBranch.name}</p>
                <p className="text-sm text-gray-600">{selectedBranch.address}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedBranch.phone}</p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-4">Your Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={16} className="inline mr-1" /> Full Name *
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={16} className="inline mr-1" /> Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Home size={16} className="inline mr-1" /> Address (Optional)
                </label>
                <textarea
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Your address for records"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Any special requests..."
                  rows="2"
                />
              </div>
            </div>
          </div>
        </main>

        {/* Place Order Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !customerInfo.name || !customerInfo.phone}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check size={20} />
                  Place Order - {formatCurrency(getCartTotal())}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Order Confirmation
  if (step === 4 && orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Toaster position="top-center" />

        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-6">Thank you for your order</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Order Number</span>
              <span className="font-mono font-bold text-green-600">{orderPlaced.order_number}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Pickup Location</span>
              <span className="font-medium">{orderPlaced.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-bold text-lg">{formatCurrency(orderPlaced.grand_total)}</span>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Please visit the selected branch to pick up your order.
              You will receive a call when your order is ready.
            </p>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setOrderPlaced(null);
              setCustomerInfo({ name: '', phone: '', address: '', notes: '' });
            }}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return null;
}
