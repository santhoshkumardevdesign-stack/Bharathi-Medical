import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeftRight, Plus, Eye, X, CheckCircle } from 'lucide-react';

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const { selectedBranch, user } = useAuth();

  const [formData, setFormData] = useState({
    from_branch_id: '', to_branch_id: '', notes: '',
    items: [{ product_id: '', quantity: '' }]
  });

  useEffect(() => {
    fetchTransfers();
    fetchBranches();
    fetchProducts();
  }, [filterStatus, selectedBranch]);

  const fetchTransfers = async () => {
    try {
      const params = { status: filterStatus || undefined };
      if (selectedBranch) params.branch_id = selectedBranch;
      const response = await api.get('/stock/transfers', { params });
      setTransfers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.data);
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
    const validItems = formData.items.filter(i => i.product_id && i.quantity);
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (formData.from_branch_id === formData.to_branch_id) {
      toast.error('Source and destination must be different');
      return;
    }
    try {
      await api.post('/stock/transfer', {
        from_branch_id: parseInt(formData.from_branch_id),
        to_branch_id: parseInt(formData.to_branch_id),
        notes: formData.notes,
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity)
        }))
      });
      toast.success('Transfer created successfully');
      setShowModal(false);
      resetForm();
      fetchTransfers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleComplete = async (transferId) => {
    try {
      await api.put(`/stock/transfers/${transferId}/status`, { status: 'completed' });
      toast.success('Transfer completed and stock updated');
      fetchTransfers();
      setShowViewModal(false);
    } catch (error) {
      toast.error('Failed to complete transfer');
    }
  };

  const viewTransfer = async (id) => {
    try {
      const response = await api.get(`/stock/transfers/${id}`);
      setSelectedTransfer(response.data.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to fetch transfer details');
    }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: '' }] });
  };

  const updateItem = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    setFormData({ ...formData, items });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({
      from_branch_id: '', to_branch_id: '', notes: '',
      items: [{ product_id: '', quantity: '' }]
    });
  };

  const getStatusColor = (status) => {
    const colors = { pending: 'badge-warning', approved: 'badge-info', in_transit: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };
    return colors[status] || 'badge-info';
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock Transfers</h1>
          <p className="text-gray-500">Transfer inventory between branches</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> New Transfer
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Transfers</p>
          <p className="text-2xl font-bold">{transfers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{transfers.filter(t => t.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="text-2xl font-bold text-blue-600">{transfers.filter(t => t.status === 'in_transit').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{transfers.filter(t => t.status === 'completed').length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-48">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="in_transit">In Transit</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Transfer #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">From</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">To</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No transfers found</td></tr>
            ) : (
              transfers.map(transfer => (
                <tr key={transfer.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-purple-600">{transfer.transfer_number}</td>
                  <td className="px-4 py-3">{transfer.from_branch_name}</td>
                  <td className="px-4 py-3">{transfer.to_branch_name}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(transfer.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${getStatusColor(transfer.status)}`}>{transfer.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => viewTransfer(transfer.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Create Stock Transfer</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Branch *</label>
                  <select value={formData.from_branch_id} onChange={(e) => setFormData({...formData, from_branch_id: e.target.value})} className="input-field" required>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To Branch *</label>
                  <select value={formData.to_branch_id} onChange={(e) => setFormData({...formData, to_branch_id: e.target.value})} className="input-field" required>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Transfer Items</label>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} className="input-field flex-1">
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="input-field w-24" min="1" />
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
                <button type="submit" className="flex-1 btn-primary">Create Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Transfer Modal */}
      {showViewModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{selectedTransfer.transfer_number}</h3>
              <button onClick={() => setShowViewModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">From Branch</p>
                  <p className="font-medium">{selectedTransfer.from_branch_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">To Branch</p>
                  <p className="font-medium">{selectedTransfer.to_branch_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusColor(selectedTransfer.status)}`}>{selectedTransfer.status}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p>{new Date(selectedTransfer.created_at).toLocaleString()}</p>
                </div>
              </div>

              <h4 className="font-medium mb-3">Transfer Items</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-center">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransfer.items?.map(item => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2 font-mono">{item.sku}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedTransfer.status !== 'completed' && selectedTransfer.status !== 'cancelled' && (
                <div className="mt-6 flex gap-3">
                  <button onClick={() => handleComplete(selectedTransfer.id)} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    <CheckCircle size={18} /> Complete Transfer
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
