import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, TrendingUp, Package, Building2, Calendar, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#9333EA', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const { selectedBranch } = useAuth();

  useEffect(() => {
    fetchReport();
  }, [activeTab, dateRange, selectedBranch]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/sales';
      const params = { start_date: dateRange.start, end_date: dateRange.end };
      if (selectedBranch) params.branch_id = selectedBranch;

      switch (activeTab) {
        case 'sales': endpoint = '/reports/sales'; break;
        case 'daily': endpoint = '/reports/sales/daily'; params.date = dateRange.end; break;
        case 'stock': endpoint = '/reports/stock'; break;
        case 'gst': endpoint = '/reports/gst'; break;
        case 'branch': endpoint = '/reports/branch-performance'; break;
        case 'product': endpoint = '/reports/product-performance'; break;
      }

      const response = await api.get(endpoint, { params });
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  const handleExport = async (type, format) => {
    try {
      toast.loading('Generating report...', { id: 'export' });

      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      if (selectedBranch) params.append('branch_id', selectedBranch);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/exports/${type}/${format}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${dateRange.start}-to-${dateRange.end}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report', { id: 'export' });
    }
  };

  const tabs = [
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'daily', label: 'Daily Report', icon: Calendar },
    { id: 'stock', label: 'Stock Report', icon: Package },
    { id: 'gst', label: 'GST Report', icon: FileText },
    { id: 'branch', label: 'Branch Performance', icon: Building2 },
    { id: 'product', label: 'Product Performance', icon: Package }
  ];

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
    if (!reportData) return <div className="text-center py-8 text-gray-500">No data available</div>;

    switch (activeTab) {
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.total_sales)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold">{reportData.summary?.total_transactions}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total GST</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.summary?.total_gst)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total Discount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.summary?.total_discount)}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">Sales Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.sales_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="total" stroke="#9333EA" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {reportData.branch_breakdown?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4">Branch Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportData.branch_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="branch" />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="total" fill="#9333EA" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );

      case 'daily':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.total_sales)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold">{reportData.summary?.total_transactions}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Avg Transaction</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.summary?.average_transaction)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total GST</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.summary?.total_gst)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  {(reportData.payment_breakdown || []).map((item, index) => (
                    <div key={item.payment_method} className="flex items-center justify-between">
                      <span className="capitalize">{item.payment_method}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">{item.count} orders</span>
                        <span className="font-semibold">{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4">Category Sales</h3>
                <div className="space-y-3">
                  {(reportData.category_sales || []).map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">{item.icon} {item.category}</span>
                      <span className="font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">Top Selling Products</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Product</th>
                    <th className="px-4 py-2 text-center text-sm">Quantity Sold</th>
                    <th className="px-4 py-2 text-right text-sm">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.top_products || []).map((product, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{product.name}</td>
                      <td className="px-4 py-2 text-center">{product.quantity_sold}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'stock':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold">{reportData.summary?.total_products}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total Stock</p>
                <p className="text-2xl font-bold">{reportData.summary?.total_stock?.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Stock Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.stock_value)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Stock Cost</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.summary?.stock_cost)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4">Category Stock</h3>
                <div className="space-y-3">
                  {(reportData.category_stock || []).map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">{item.icon} {item.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">{item.quantity} units</span>
                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4 text-red-600">Low Stock Items ({reportData.low_stock?.length || 0})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(reportData.low_stock || []).slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.branch_name}</p>
                      </div>
                      <span className="text-red-600 font-bold">{item.quantity} left</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'gst':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Taxable Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.summary?.taxable_amount)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total GST Collected</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.summary?.total_gst)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500">Total with GST</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.total_with_gst)}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">GST Rate Breakdown</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">GST Rate</th>
                    <th className="px-4 py-2 text-center text-sm">Items</th>
                    <th className="px-4 py-2 text-right text-sm">Taxable Value</th>
                    <th className="px-4 py-2 text-right text-sm">GST Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.rate_breakdown || []).map((item) => (
                    <tr key={item.gst_rate} className="border-b">
                      <td className="px-4 py-2 font-medium">{item.gst_rate}%</td>
                      <td className="px-4 py-2 text-center">{item.items}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.taxable_value)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.gst_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'branch':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">Branch</th>
                    <th className="px-4 py-3 text-center text-sm">Transactions</th>
                    <th className="px-4 py-3 text-right text-sm">Total Sales</th>
                    <th className="px-4 py-3 text-right text-sm">Avg Transaction</th>
                    <th className="px-4 py-3 text-center text-sm">Stock</th>
                    <th className="px-4 py-3 text-center text-sm">Low Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.branches || []).map((branch) => (
                    <tr key={branch.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${branch.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                          {branch.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{branch.total_transactions}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(branch.total_sales)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(branch.avg_transaction)}</td>
                      <td className="px-4 py-3 text-center">{branch.current_stock?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${branch.low_stock_items > 0 ? 'badge-warning' : 'badge-success'}`}>
                          {branch.low_stock_items}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'product':
        return (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">Product</th>
                  <th className="px-4 py-3 text-left text-sm">Category</th>
                  <th className="px-4 py-3 text-center text-sm">Sold</th>
                  <th className="px-4 py-3 text-right text-sm">Revenue</th>
                  <th className="px-4 py-3 text-right text-sm">Est. Profit</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.products || []).map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{product.category}</td>
                    <td className="px-4 py-3 text-center">{product.total_sold || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(product.total_revenue)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(product.estimated_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500">View business analytics and reports</p>
        </div>
      </div>

      {/* Date Range & Export */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="input-field w-40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="input-field w-40" />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {(activeTab === 'sales' || activeTab === 'daily') && (
            <>
              <button
                onClick={() => handleExport('sales', 'pdf')}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={() => handleExport('sales', 'excel')}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
            </>
          )}
          {activeTab === 'stock' && (
            <>
              <button
                onClick={() => handleExport('stock', 'pdf')}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={() => handleExport('stock', 'excel')}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
            </>
          )}
          {activeTab === 'gst' && (
            <button
              onClick={() => handleExport('gst', 'excel')}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              <FileSpreadsheet size={16} />
              GST Excel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {renderContent()}
    </div>
  );
}
