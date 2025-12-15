import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Search, Plus, Edit, Trash2, X, Truck, Phone, Mail } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [formData, setFormData] = useState({
    name: '', gst_number: '', phone: '', email: '', address: '',
    contact_person: '', payment_terms: 'Net 30', credit_limit: '', products_supplied: ''
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier created');
      }
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name, gst_number: supplier.gst_number || '', phone: supplier.phone,
      email: supplier.email || '', address: supplier.address || '', contact_person: supplier.contact_person || '',
      payment_terms: supplier.payment_terms, credit_limit: supplier.credit_limit,
      products_supplied: supplier.products_supplied || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({ name: '', gst_number: '', phone: '', email: '', address: '', contact_person: '', payment_terms: 'Net 30', credit_limit: '', products_supplied: '' });
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-gray-500">Manage your supplier network</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8"><div className="spinner mx-auto"></div></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">No suppliers found</div>
        ) : (
          filtered.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-xl shadow-sm p-5 card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Truck className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{supplier.name}</h3>
                    {supplier.gst_number && <p className="text-xs text-gray-500">GST: {supplier.gst_number}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(supplier)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(supplier.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2"><Phone size={14} /> {supplier.phone}</p>
                {supplier.email && <p className="flex items-center gap-2"><Mail size={14} /> {supplier.email}</p>}
                {supplier.contact_person && <p>Contact: {supplier.contact_person}</p>}
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t">
                <span className="text-gray-500">{supplier.payment_terms}</span>
                <span className="font-semibold">Credit: {formatCurrency(supplier.credit_limit)}</span>
              </div>
              {supplier.products_supplied && (
                <p className="mt-2 text-xs text-gray-500 line-clamp-1">Products: {supplier.products_supplied}</p>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editingSupplier ? 'Edit' : 'Add'} Supplier</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Number</label>
                  <input type="text" value={formData.gst_number} onChange={(e) => setFormData({...formData, gst_number: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Person</label>
                  <input type="text" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="input-field" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Terms</label>
                  <select value={formData.payment_terms} onChange={(e) => setFormData({...formData, payment_terms: e.target.value})} className="input-field">
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Immediate">Immediate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Limit</label>
                  <input type="number" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Products Supplied</label>
                <input type="text" value={formData.products_supplied} onChange={(e) => setFormData({...formData, products_supplied: e.target.value})} className="input-field" placeholder="e.g., Pet Food, Medicines" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editingSupplier ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
