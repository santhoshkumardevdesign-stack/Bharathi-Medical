import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, Minus, Package, AlertTriangle, Calendar } from 'lucide-react';

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const { selectedBranch, user } = useAuth();

  const branchId = selectedBranch || user?.branch_id || 1;

  useEffect(() => {
    fetchStock();
    fetchCategories();
  }, [branchId, selectedCategory, showLowStock]);

  const fetchStock = async () => {
    try {
      const params = { category: selectedCategory || undefined, low_stock: showLowStock };
      const response = await api.get(`/stock/branch/${branchId}`, { params });
      setStock(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleAdjust = async () => {
    if (!adjustmentQty || adjustmentQty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    try {
      await api.post('/stock/adjust', {
        product_id: selectedProduct.product_id,
        branch_id: branchId,
        adjustment_type: adjustmentType,
        quantity: parseInt(adjustmentQty),
        reason: adjustmentReason
      });
      toast.success('Stock adjusted successfully');
      setShowAdjustModal(false);
      setAdjustmentQty('');
      setAdjustmentReason('');
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const filteredStock = stock.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => `₹${parseFloat(amount).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock Management</h1>
          <p className="text-gray-500">Track and manage inventory levels</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stock.length}</p>
              <p className="text-sm text-gray-500">Total Products</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Package className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stock.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Units</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stock.filter(s => s.stock_status === 'low_stock').length}</p>
              <p className="text-sm text-gray-500">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Calendar className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stock.filter(s => s.expiry_status === 'expiring_soon').length}</p>
              <p className="text-sm text-gray-500">Expiring Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field w-48"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              showLowStock ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <AlertTriangle size={18} />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Current Stock</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Min Level</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Expiry</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
            ) : filteredStock.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-500">No stock items found</td></tr>
            ) : (
              filteredStock.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.category_icon || '📦'}</span>
                      <span className="font-medium">{item.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{item.sku}</td>
                  <td className="px-4 py-3"><span className="badge badge-info">{item.category_name}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg font-bold ${
                      item.quantity === 0 ? 'text-red-600' :
                      item.quantity < item.min_stock ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{item.min_stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${
                      item.stock_status === 'out_of_stock' ? 'badge-danger' :
                      item.stock_status === 'low_stock' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {item.stock_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.expiry_date ? (
                      <span className={`text-sm ${
                        item.expiry_status === 'expired' ? 'text-red-600 font-bold' :
                        item.expiry_status === 'expiring_soon' ? 'text-yellow-600' : ''
                      }`}>
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedProduct(item); setAdjustmentType('add'); setShowAdjustModal(true); }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Add Stock"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={() => { setSelectedProduct(item); setAdjustmentType('remove'); setShowAdjustModal(true); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remove Stock"
                      >
                        <Minus size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-lg">
                {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </h3>
              <p className="text-sm text-gray-500">{selectedProduct.product_name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Stock</label>
                <p className="text-2xl font-bold">{selectedProduct.quantity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adjustment Type</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="input-field"
                >
                  <option value="add">Add Stock</option>
                  <option value="remove">Remove Stock</option>
                  <option value="damage">Damaged</option>
                  <option value="expired">Expired</option>
                  <option value="correction">Stock Correction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="input-field"
                  placeholder="Enter quantity"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="input-field"
                  rows="2"
                  placeholder="Enter reason for adjustment"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowAdjustModal(false); setAdjustmentQty(''); setAdjustmentReason(''); }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleAdjust} className="flex-1 btn-primary">
                  Confirm Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
