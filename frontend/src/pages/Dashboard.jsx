import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  AlertTriangle,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  Building2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const COLORS = ['#9333EA', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedBranch } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBranch]);

  const fetchDashboardData = async () => {
    try {
      const params = selectedBranch ? { branch_id: selectedBranch } : {};
      const response = await api.get('/dashboard', { params });
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
        </div>
        <Link
          to="/sales"
          className="btn-primary flex items-center gap-2"
        >
          <ShoppingCart size={20} />
          New Sale
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <DollarSign className="text-purple-600" size={24} />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${
              data?.summary?.today_sales?.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data?.summary?.today_sales?.change_percentage >= 0 ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              {Math.abs(data?.summary?.today_sales?.change_percentage || 0)}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">
            {formatCurrency(data?.summary?.today_sales?.total || 0)}
          </h3>
          <p className="text-gray-500 text-sm">Today's Sales</p>
          <p className="text-xs text-gray-400 mt-1">
            {data?.summary?.today_sales?.transactions || 0} transactions
          </p>
        </div>

        {/* Stock Value */}
        <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">
            {formatCurrency(data?.summary?.stock?.total_value || 0)}
          </h3>
          <p className="text-gray-500 text-sm">Total Stock Value</p>
          <p className="text-xs text-gray-400 mt-1">
            {(data?.summary?.stock?.total_quantity || 0).toLocaleString()} items
          </p>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">
            {(data?.summary?.alerts?.low_stock || 0) + (data?.summary?.alerts?.out_of_stock || 0)}
          </h3>
          <p className="text-gray-500 text-sm">Stock Alerts</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span>{data?.summary?.alerts?.low_stock || 0} low</span>
            <span>{data?.summary?.alerts?.out_of_stock || 0} out</span>
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Calendar className="text-yellow-600" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">
            {(data?.summary?.alerts?.expiring_soon || 0) + (data?.summary?.alerts?.expired || 0)}
          </h3>
          <p className="text-gray-500 text-sm">Expiry Alerts</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span>{data?.summary?.alerts?.expiring_soon || 0} expiring</span>
            <span className="text-red-500">{data?.summary?.alerts?.expired || 0} expired</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.charts?.weekly_sales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Sales']}
                labelFormatter={(date) => new Date(date).toLocaleDateString('en-IN')}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#9333EA"
                strokeWidth={3}
                dot={{ fill: '#9333EA' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Today's Payment Methods</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={data?.charts?.payment_breakdown || []}
                  dataKey="total"
                  nameKey="payment_method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                >
                  {(data?.charts?.payment_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {(data?.charts?.payment_breakdown || []).map((item, index) => (
                <div key={item.payment_method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-gray-600 capitalize">{item.payment_method}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Branch Summary & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Summary */}
        {!selectedBranch && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Branch Performance</h3>
              <Link to="/branches" className="text-purple-600 text-sm hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Branch</th>
                    <th className="pb-3 font-medium">Today's Sales</th>
                    <th className="pb-3 font-medium">Transactions</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.branch_summary || []).slice(0, 5).map((branch) => (
                    <tr key={branch.id} className="border-b border-gray-50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="font-medium">{branch.name}</span>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-green-600">
                        {formatCurrency(branch.today_sales)}
                      </td>
                      <td className="py-3 text-gray-600">{branch.today_transactions}</td>
                      <td className="py-3 text-gray-600">{branch.total_stock?.toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`badge ${
                          branch.status === 'active' ? 'badge-success' :
                          branch.status === 'maintenance' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {branch.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Low Stock Alerts */}
        <div className={`bg-white rounded-xl shadow-sm p-6 ${selectedBranch ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              Low Stock Alerts
            </h3>
            <Link to="/low-stock" className="text-purple-600 text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.low_stock_alerts || []).slice(0, 5).map((item) => (
              <div key={`${item.id}-${item.branch_name}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku} - {item.branch_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{item.quantity} left</p>
                  <p className="text-xs text-gray-500">Min: {item.min_stock}</p>
                </div>
              </div>
            ))}
            {(!data?.low_stock_alerts || data.low_stock_alerts.length === 0) && (
              <p className="text-gray-500 text-center py-4">No low stock alerts</p>
            )}
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="text-yellow-500" size={18} />
              Expiring Soon
            </h3>
            <Link to="/expiry" className="text-purple-600 text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.expiry_alerts || []).slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.branch_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-600">{item.days_until_expiry} days</p>
                  <p className="text-xs text-gray-500">{item.quantity} units</p>
                </div>
              </div>
            ))}
            {(!data?.expiry_alerts || data.expiry_alerts.length === 0) && (
              <p className="text-gray-500 text-center py-4">No expiry alerts</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Recent Sales</h3>
          <Link to="/reports" className="text-purple-600 text-sm hover:underline flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Branch</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Payment</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_sales || []).map((sale) => (
                <tr key={sale.id} className="border-b border-gray-50">
                  <td className="py-3 font-mono text-sm text-purple-600">{sale.invoice_number}</td>
                  <td className="py-3">{sale.customer_name || 'Walk-in'}</td>
                  <td className="py-3 text-gray-600">{sale.branch_name}</td>
                  <td className="py-3 font-semibold">{formatCurrency(sale.grand_total)}</td>
                  <td className="py-3">
                    <span className={`badge ${
                      sale.payment_method === 'cash' ? 'badge-success' :
                      sale.payment_method === 'upi' ? 'badge-info' :
                      sale.payment_method === 'card' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-sm">
                    {new Date(sale.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
