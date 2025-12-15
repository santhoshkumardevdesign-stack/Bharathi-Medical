import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SalesPOS from './pages/SalesPOS';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Branches from './pages/Branches';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Reports from './pages/Reports';
import LowStockAlerts from './pages/LowStockAlerts';
import ExpiryTracking from './pages/ExpiryTracking';
import StockTransfers from './pages/StockTransfers';
import OnlineOrder from './pages/OnlineOrder';
import CustomerApp from './pages/CustomerApp';
import ShopKeeperApp from './pages/ShopKeeperApp';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/order" element={<OnlineOrder />} />
      <Route path="/shop" element={<CustomerApp />} />
      <Route path="/pos" element={<ShopKeeperApp />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sales" element={<SalesPOS />} />
                <Route path="/products" element={<Products />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/low-stock" element={<LowStockAlerts />} />
                <Route path="/expiry" element={<ExpiryTracking />} />
                <Route path="/transfers" element={<StockTransfers />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
