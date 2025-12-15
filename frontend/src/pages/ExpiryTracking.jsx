import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Calendar, AlertTriangle, Trash2 } from 'lucide-react';

export default function ExpiryTracking() {
  const [expiredItems, setExpiredItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expiring');
  const [daysFilter, setDaysFilter] = useState(30);
  const { selectedBranch, user } = useAuth();

  useEffect(() => {
    fetchExpiryData();
  }, [selectedBranch, daysFilter]);

  const fetchExpiryData = async () => {
    try {
      const params = { days: daysFilter };
      if (selectedBranch) params.branch_id = selectedBranch;

      const [expiringRes, expiredRes] = await Promise.all([
        api.get('/products/expiring', { params }),
        api.get('/products/expired', { params: { branch_id: selectedBranch } })
      ]);

      setExpiringItems(expiringRes.data.data);
      setExpiredItems(expiredRes.data.data);
    } catch (error) {
      console.error('Failed to fetch expiry data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExpired = async (item) => {
    if (!confirm(`Remove ${item.quantity} units of ${item.name} from stock?`)) return;
    try {
      await api.post('/stock/adjust', {
        product_id: item.id,
        branch_id: item.branch_id,
        adjustment_type: 'expired',
        quantity: item.quantity,
        reason: 'Expired product removal',
        batch_number: item.batch_number
      });
      toast.success('Expired items removed from stock');
      fetchExpiryData();
    } catch (error) {
      toast.error('Failed to remove expired items');
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  const expiredValue = expiredItems.reduce((sum, item) => sum + (item.quantity * (item.selling_price || 0)), 0);
  const expiringValue = expiringItems.reduce((sum, item) => sum + (item.quantity * (item.selling_price || 0)), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expiry Tracking</h1>
          <p className="text-gray-500">Monitor products approaching expiry dates</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{expiredItems.length}</p>
              <p className="text-sm text-gray-500">Expired Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Calendar className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{expiringItems.length}</p>
              <p className="text-sm text-gray-500">Expiring Soon</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div>
            <p className="text-sm text-gray-500">Expired Value</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(expiredValue)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div>
            <p className="text-sm text-gray-500">At Risk Value</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(expiringValue)}</p>
          </div>
        </div>
      </div>

      {/* Tabs and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('expiring')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'expiring' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Expiring Soon ({expiringItems.length})
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'expired' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Expired ({expiredItems.length})
          </button>
        </div>
        {activeTab === 'expiring' && (
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(parseInt(e.target.value))}
            className="input-field w-40"
          >
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
          </select>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Branch</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Batch</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Quantity</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Expiry Date</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                {activeTab === 'expired' ? 'Days Expired' : 'Days Left'}
              </th>
              {activeTab === 'expired' && (
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'expiring' ? expiringItems : expiredItems).length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'expired' ? 8 : 7} className="text-center py-8 text-gray-500">
                  No {activeTab === 'expired' ? 'expired' : 'expiring'} items found
                </td>
              </tr>
            ) : (
              (activeTab === 'expiring' ? expiringItems : expiredItems).map((item, index) => (
                <tr key={index} className={`border-b ${activeTab === 'expired' ? 'bg-red-50' : 'hover:bg-yellow-50'}`}>
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
                  <td className="px-4 py-3 text-center text-gray-500">{item.batch_number || '-'}</td>
                  <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                  <td className="px-4 py-3 text-center">
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${activeTab === 'expired' ? 'badge-danger' :
                      item.days_until_expiry <= 7 ? 'badge-danger' :
                      item.days_until_expiry <= 15 ? 'badge-warning' : 'badge-info'
                    }`}>
                      {activeTab === 'expired' ? item.days_expired : item.days_until_expiry} days
                    </span>
                  </td>
                  {activeTab === 'expired' && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveExpired(item)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Remove from stock"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
