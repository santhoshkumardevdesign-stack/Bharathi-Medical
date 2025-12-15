import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Search, Plus, Eye, X, FileText, Package } from 'lucide-react';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const { selectedBranch, user } = useAuth();

  const [formData, setFormData] = useState({
    supplier_id: '', expected_delivery: '', notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }]
  });

  const branchId = selectedBranch || user?.branch_id || 1;

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, [filterStatus, branchId]);

  const fetchOrders = async () => {
    try {
      const params = { branch_id: branchId, status: filterStatus || undefined };
      const response = await api.get('/purchase-orders', { params });
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { active_only: true } });
      setSuppliers(response.data.data);
    } catch (error) {}
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data);
    } catch (error) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => i.product_id && i.quantity && i.unit_price);
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    try {
      await api.post('/purchase-orders', {
        supplier_id: formData.supplier_id,
        branch_id: branchId,
        expected_delivery: formData.expected_delivery,
        notes: formData.notes,
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity),
          unit_price: parseFloat(i.unit_price)
        }))
      });
      toast.success('Purchase order created');
      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create order');
    }
  };

  const handleReceive = async (orderId) => {
    try {
      const order = await api.get(`/purchase-orders/${orderId}`);
      const items = order.data.data.items.map(i => ({ id: i.id, received_quantity: i.quantity }));
      await api.post(`/purchase-orders/${orderId}/receive`, { items });
      toast.success('Goods received and stock updated');
      fetchOrders();
      setShowViewModal(false);
    } catch (error) {
      toast.error('Failed to receive goods');
    }
  };

  const viewOrder = async (id) => {
    try {
      const response = await api.get(`/purchase-orders/${id}`);
      setSelectedOrder(response.data.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to fetch order details');
    }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: '', unit_price: '' }] });
  };

  const updateItem = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    if (field === 'product_id') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) items[index].unit_price = product.purchase_price || product.selling_price * 0.7;
    }
    setFormData({ ...formData, items });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({ supplier_id: '', expected_delivery: '', notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] });
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
  const getStatusColor = (status) => {
    const colors = { pending: 'badge-warning', confirmed: 'badge-info', in_transit: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };
    return colors[status] || 'badge-info';
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
          <p className="text-gray-500">Manage orders from suppliers</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Create PO
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-48">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">PO Number</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Supplier</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Order Date</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No orders found</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-purple-600">{order.po_number}</td>
                  <td className="px-4 py-3">{order.supplier_name}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(order.order_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3 text-center"><span className={`badge ${getStatusColor(order.status)}`}>{order.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => viewOrder(order.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Create Purchase Order</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <select value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: e.target.value})} className="input-field" required>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                  <input type="date" value={formData.expected_delivery} onChange={(e) => setFormData({...formData, expected_delivery: e.target.value})} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Order Items</label>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} className="input-field flex-1">
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="input-field w-20" min="1" />
                    <input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} className="input-field w-28" step="0.01" />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><X size={18} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-purple-600 text-sm hover:underline">+ Add Item</button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input-field" rows="2" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{selectedOrder.po_number}</h3>
              <button onClick={() => setShowViewModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedOrder.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p>{new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
              </div>

              <h4 className="font-medium mb-3">Items</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map(item => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <div className="mt-6 flex gap-3">
                  <button onClick={() => handleReceive(selectedOrder.id)} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    <Package size={18} /> Receive Goods
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
