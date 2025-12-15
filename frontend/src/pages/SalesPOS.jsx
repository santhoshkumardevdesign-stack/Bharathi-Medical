import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Wallet,
  Smartphone,
  DollarSign,
  User,
  X,
  Pause,
  Play,
  Printer,
  Calculator
} from 'lucide-react';

export default function SalesPOS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amount');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [heldSales, setHeldSales] = useState([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const searchRef = useRef(null);
  const { selectedBranch, user } = useAuth();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchHeldSales();
  }, [selectedBranch]);

  const fetchProducts = async () => {
    try {
      const params = { branch_id: selectedBranch || user?.branch_id };
      const response = await api.get('/products', { params });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchHeldSales = async () => {
    try {
      const params = { branch_id: selectedBranch || user?.branch_id };
      const response = await api.get('/sales/held/list', { params });
      setHeldSales(response.data.data);
    } catch (error) {
      console.error('Failed to fetch held sales:', error);
    }
  };

  const searchCustomers = async (term) => {
    if (term.length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const response = await api.get('/customers/search', { params: { q: term } });
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to search customers:', error);
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      toast.error('Product out of stock');
      return;
    }

    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Not enough stock');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
        gst_rate: product.gst_rate,
        quantity: 1,
        max_stock: product.stock
      }]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product_id === productId) {
        if (quantity > item.max_stock) {
          toast.error('Not enough stock');
          return item;
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const calculateGST = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.unit_price * item.quantity;
      return sum + (itemTotal * item.gst_rate / 100);
    }, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return discount;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST() - calculateDiscount();
  };

  const holdSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      await api.post('/sales/hold', {
        branch_id: selectedBranch || user?.branch_id,
        customer_id: selectedCustomer?.id,
        cart_data: { cart, discount, discountType }
      });
      toast.success('Sale held successfully');
      clearCart();
      fetchHeldSales();
    } catch (error) {
      toast.error('Failed to hold sale');
    }
  };

  const resumeSale = async (heldSale) => {
    setCart(heldSale.cart_data.cart);
    setDiscount(heldSale.cart_data.discount || 0);
    setDiscountType(heldSale.cart_data.discountType || 'amount');
    if (heldSale.customer_id) {
      setSelectedCustomer({ id: heldSale.customer_id, name: heldSale.customer_name });
    }

    // Delete held sale
    try {
      await api.delete(`/sales/held/${heldSale.id}`);
      fetchHeldSales();
    } catch (error) {
      console.error('Failed to delete held sale:', error);
    }

    setShowHeldSales(false);
    toast.success('Sale resumed');
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/sales', {
        branch_id: selectedBranch || user?.branch_id,
        customer_id: selectedCustomer?.id,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        discount: calculateDiscount(),
        discount_type: discountType,
        payment_method: paymentMethod
      });

      setLastSale(response.data.data);
      setShowReceipt(true);
      toast.success('Sale completed successfully!');
      clearCart();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType('amount');
    setPaymentMethod('cash');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-160px)]">
      {/* Left side - Products */}
      <div className="flex-1 flex flex-col">
        {/* Search and Categories */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                autoFocus
              />
            </div>
            <button
              onClick={() => setShowHeldSales(true)}
              className="btn-secondary flex items-center gap-2 relative"
            >
              <Pause size={18} />
              Held Sales
              {heldSales.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {heldSales.length}
                </span>
              )}
            </button>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    product.stock <= 0
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : product.stock < (product.min_stock || 10)
                      ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-400'
                      : 'border-gray-100 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{product.category_icon || '📦'}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock <= 0 ? 'bg-red-100 text-red-700' :
                      product.stock < (product.min_stock || 10) ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {product.stock <= 0 ? 'Out' : product.stock}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-800 text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">{product.sku}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-600">
                      {formatCurrency(product.selling_price)}
                    </span>
                    <span className="text-xs text-gray-400">
                      GST {product.gst_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="w-96 bg-white rounded-xl shadow-sm flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart size={20} />
              Current Sale
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="mt-4">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-purple-600" />
                  <span className="font-medium text-purple-700">{selectedCustomer.name}</span>
                </div>
                <button onClick={() => setSelectedCustomer(null)}>
                  <X size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customer or walk-in..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                  onFocus={() => setShowCustomerSearch(true)}
                  className="input-field text-sm"
                />
                {showCustomerSearch && customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {customers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerSearch(false);
                          setCustomerSearchTerm('');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>{customer.name}</span>
                        <span className="text-xs text-gray-400">{customer.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
              <p>Cart is empty</p>
              <p className="text-sm">Add products to start billing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.unit_price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right w-20">
                    <p className="font-semibold text-sm">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t p-4">
          {/* Discount */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Discount"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="input-field text-sm"
              />
            </div>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="input-field text-sm w-24"
            >
              <option value="amount">₹</option>
              <option value="percentage">%</option>
            </select>
          </div>

          {/* Totals */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST</span>
              <span>{formatCurrency(calculateGST())}</span>
            </div>
            {calculateDiscount() > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(calculateDiscount())}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-purple-600">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { method: 'cash', icon: DollarSign, label: 'Cash' },
              { method: 'upi', icon: Smartphone, label: 'UPI' },
              { method: 'card', icon: CreditCard, label: 'Card' },
              { method: 'credit', icon: Wallet, label: 'Credit' }
            ].map(({ method, icon: Icon, label }) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                  paymentMethod === method
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={holdSale}
              disabled={cart.length === 0}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <Pause size={18} />
              Hold
            </button>
            <button
              onClick={completeSale}
              disabled={cart.length === 0 || processing}
              className="flex-[2] btn-primary flex items-center justify-center gap-2"
            >
              {processing ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <Calculator size={18} />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Held Sales Modal */}
      {showHeldSales && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Held Sales</h3>
              <button onClick={() => setShowHeldSales(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {heldSales.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No held sales</p>
              ) : (
                <div className="space-y-3">
                  {heldSales.map(sale => (
                    <div
                      key={sale.id}
                      className="p-4 border rounded-lg hover:border-purple-300 cursor-pointer"
                      onClick={() => resumeSale(sale)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{sale.customer_name || 'Walk-in'}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(sale.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {sale.cart_data.cart.length} items
                        </span>
                        <span className="font-semibold text-purple-600">
                          {formatCurrency(
                            sale.cart_data.cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Sale Complete!</h3>
              <button onClick={() => setShowReceipt(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Payment Successful</h4>
              <p className="text-gray-500 mb-4">Invoice: {lastSale.invoice_number}</p>
              <p className="text-3xl font-bold text-purple-600 mb-6">
                {formatCurrency(lastSale.grand_total)}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={printReceipt}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer size={18} />
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="btn-primary"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt - Hidden normally */}
      {lastSale && (
        <div className="print-only fixed inset-0 bg-white p-8">
          <div className="max-w-sm mx-auto text-center">
            <h1 className="text-2xl font-bold mb-1">PetCare Pro</h1>
            <p className="text-sm text-gray-600 mb-4">{lastSale.branch_name}</p>
            <p className="text-sm mb-4">{lastSale.branch_address}</p>
            <hr className="my-4" />
            <div className="text-left">
              <p><strong>Invoice:</strong> {lastSale.invoice_number}</p>
              <p><strong>Date:</strong> {new Date(lastSale.created_at).toLocaleString()}</p>
              <p><strong>Customer:</strong> {lastSale.customer_name || 'Walk-in'}</p>
              <p><strong>Cashier:</strong> {lastSale.cashier_name}</p>
            </div>
            <hr className="my-4" />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items?.map((item, index) => (
                  <tr key={index} className="border-b border-dashed">
                    <td className="py-1">{item.product_name}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr className="my-4" />
            <div className="text-right">
              <p>Subtotal: {formatCurrency(lastSale.subtotal)}</p>
              <p>GST: {formatCurrency(lastSale.gst_amount)}</p>
              {lastSale.discount > 0 && <p>Discount: -{formatCurrency(lastSale.discount)}</p>}
              <p className="text-xl font-bold mt-2">Total: {formatCurrency(lastSale.grand_total)}</p>
              <p className="mt-2">Payment: {lastSale.payment_method.toUpperCase()}</p>
            </div>
            <hr className="my-4" />
            <p className="text-sm">Thank you for shopping with us!</p>
            <p className="text-xs text-gray-500 mt-2">🐾 PetCare Pro - Your Pet's Best Friend</p>
          </div>
        </div>
      )}
    </div>
  );
}
