import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Building2,
  Users,
  Truck,
  FileText,
  AlertTriangle,
  Calendar,
  ArrowLeftRight,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Search
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/sales', icon: ShoppingCart, label: 'Sales / POS' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/stock', icon: Warehouse, label: 'Stock Management' },
  { path: '/branches', icon: Building2, label: 'Branches' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/suppliers', icon: Truck, label: 'Suppliers' },
  { path: '/purchase-orders', icon: FileText, label: 'Purchase Orders' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { divider: true },
  { path: '/low-stock', icon: AlertTriangle, label: 'Low Stock Alerts', badge: true },
  { path: '/expiry', icon: Calendar, label: 'Expiry Tracking' },
  { path: '/transfers', icon: ArrowLeftRight, label: 'Stock Transfers' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [notifications, setNotifications] = useState({ lowStock: 0, expiring: 0 });
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, selectedBranch, setSelectedBranch, isAdmin } = useAuth();

  useEffect(() => {
    fetchBranches();
    fetchNotifications();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const params = selectedBranch ? { branch_id: selectedBranch } : {};
      const [lowStockRes, expiryRes] = await Promise.all([
        api.get('/products/low-stock', { params }),
        api.get('/products/expiring', { params: { ...params, days: 30 } })
      ]);
      setNotifications({
        lowStock: lowStockRes.data.count,
        expiring: expiryRes.data.count
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentBranch = branches.find(b => b.id === selectedBranch);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-white shadow-md text-gray-600"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-full bg-white border-r border-gray-200 flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/images/bharathiyar.png"
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover"
                onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl">🐾</div>'; }}
              />
              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-gray-800">Bharathi Medicals</h1>
                  <p className="text-xs text-gray-500">Vet & Pet Shop</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item, index) => {
                if (item.divider) {
                  return <li key={index} className="border-t border-gray-100 my-4"></li>;
                }

                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const badgeCount = item.badge && item.path === '/low-stock' ? notifications.lowStock : 0;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={20} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {badgeCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-100">
            <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Toggle sidebar button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>

            {/* Branch selector */}
            {isAdmin && (
              <div className="relative ml-4">
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Building2 size={18} />
                  <span className="font-medium">
                    {currentBranch?.name || 'All Branches'}
                  </span>
                  <ChevronDown size={16} />
                </button>

                {showBranchDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setSelectedBranch(null);
                        setShowBranchDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${
                        !selectedBranch ? 'bg-green-50 text-green-700' : ''
                      }`}
                    >
                      All Branches
                    </button>
                    {branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranch(branch.id);
                          setShowBranchDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                          selectedBranch === branch.id ? 'bg-green-50 text-green-700' : ''
                        }`}
                      >
                        <span>{branch.name}</span>
                        {branch.status !== 'active' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            {branch.status}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1"></div>

            {/* Search */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-4 py-2 mr-4">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search products, customers..."
                className="bg-transparent border-none outline-none ml-2 w-64 text-sm"
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-4">
              <Link
                to="/low-stock"
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <Bell size={20} />
                {(notifications.lowStock + notifications.expiring) > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.lowStock + notifications.expiring}
                  </span>
                )}
              </Link>

              <Link
                to="/settings"
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <Settings size={20} />
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}
