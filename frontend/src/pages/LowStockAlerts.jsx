import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { AlertTriangle, Package, ShoppingCart } from 'lucide-react';

export default function LowStockAlerts() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedBranch } = useAuth();

  useEffect(() => {
    fetchLowStock();
  }, [selectedBranch]);

  const fetchLowStock = async () => {
    try {
      const params = selectedBranch ? { branch_id: selectedBranch } : {};
      const [lowStockRes, outOfStockRes] = await Promise.all([
        api.get('/products/low-stock', { params }),
        api.get('/products/low-stock', { params }) // We'll filter client-side for out of stock
      ]);
      setLowStockItems(lowStockRes.data.data.filter(item => item.current_stock > 0));
      setOutOfStockItems(lowStockRes.data.data.filter(item => item.current_stock === 0));
    } catch (error) {
      console.error('Failed to fetch low stock items');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Low Stock Alerts</h1>
          <p className="text-gray-500">Products that need to be reordered</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              <p className="text-sm text-gray-500">Low Stock Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Package className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              <p className="text-sm text-gray-500">Out of Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ShoppingCart className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{lowStockItems.length + outOfStockItems.length}</p>
              <p className="text-sm text-gray-500">Total Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-yellow-50">
          <h3 className="font-semibold flex items-center gap-2 text-yellow-700">
            <AlertTriangle size={18} />
            Low Stock Items ({lowStockItems.length})
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Branch</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Current Stock</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Min Level</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Suggested Reorder</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Price</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">No low stock items</td></tr>
            ) : (
              lowStockItems.map((item, index) => (
                <tr key={index} className="border-b hover:bg-yellow-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.category_icon || '📦'}</span>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{item.sku}</td>
                  <td className="px-4 py-3">{item.branch_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-600 font-bold">{item.current_stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{item.min_stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge badge-info">{item.reorder_quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.selling_price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Out of Stock Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-red-50">
          <h3 className="font-semibold flex items-center gap-2 text-red-700">
            <Package size={18} />
            Out of Stock Items ({outOfStockItems.length})
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Branch</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Min Level</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Suggested Order</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Price</th>
            </tr>
          </thead>
          <tbody>
            {outOfStockItems.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No out of stock items</td></tr>
            ) : (
              outOfStockItems.map((item, index) => (
                <tr key={index} className="border-b hover:bg-red-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.category_icon || '📦'}</span>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{item.sku}</td>
                  <td className="px-4 py-3">{item.branch_name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{item.min_stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge badge-danger">{item.min_stock * 2}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.selling_price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
