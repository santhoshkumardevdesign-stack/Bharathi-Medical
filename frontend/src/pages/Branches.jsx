import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Building2, Phone, Clock, Users, TrendingUp, Package, MapPin } from 'lucide-react';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  const totalSales = branches.reduce((sum, b) => sum + (b.today_sales || 0), 0);
  const totalTransactions = branches.reduce((sum, b) => sum + (b.today_transactions || 0), 0);
  const totalStock = branches.reduce((sum, b) => sum + (b.total_stock || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Branches</h1>
          <p className="text-gray-500">Manage all 8 PetCare Pro locations</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Building2 size={24} />
            <div>
              <p className="text-3xl font-bold">{branches.length}</p>
              <p className="text-sm opacity-80">Total Branches</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
              <p className="text-sm text-gray-500">Today's Total Sales</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTransactions}</p>
              <p className="text-sm text-gray-500">Today's Transactions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Stock Units</p>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {branches.map((branch, index) => (
          <div
            key={branch.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden card-hover ${
              branch.status !== 'active' ? 'opacity-75' : ''
            }`}
          >
            <div className={`h-2 ${
              branch.status === 'active' ? 'bg-green-500' :
              branch.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                    🏪
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{branch.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      branch.status === 'active' ? 'bg-green-100 text-green-700' :
                      branch.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {branch.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span>{branch.opening_hours}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={16} />
                  <span>{branch.manager_name}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">{formatCurrency(branch.today_sales)}</p>
                  <p className="text-xs text-gray-500">Today's Sales</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-purple-600">{(branch.total_stock || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Stock Units</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {branch.staff_count} staff
                </span>
                <span>{branch.today_transactions || 0} orders today</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
