import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Search, Plus, Edit, Trash2, User, Phone, Mail, X, Heart } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPetModal, setShowPetModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', customer_type: 'retail', gst_number: ''
  });

  const [petData, setPetData] = useState({
    name: '', species: 'Dog', breed: '', age_years: '', age_months: '', gender: 'male', weight: '', color: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [filterType]);

  const fetchCustomers = async () => {
    try {
      const params = { type: filterType || undefined };
      const response = await api.get('/customers', { params });
      setCustomers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${selectedCustomer.id}/pets`, petData);
      toast.success('Pet added successfully');
      setShowPetModal(false);
      setPetData({ name: '', species: 'Dog', breed: '', age_years: '', age_months: '', gender: 'male', weight: '', color: '' });
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add pet');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      customer_type: customer.customer_type,
      gst_number: customer.gst_number || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '', customer_type: 'retail', gst_number: '' });
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-500">Manage your customer database and their pets</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Add Customer
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <User className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{customers.length}</p>
              <p className="text-sm text-gray-500">Total Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <User className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{customers.filter(c => c.customer_type === 'retail').length}</p>
              <p className="text-sm text-gray-500">Retail Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <User className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{customers.filter(c => c.customer_type === 'wholesale').length}</p>
              <p className="text-sm text-gray-500">Wholesale Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field w-48">
            <option value="">All Types</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contact</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Pets</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Orders</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Purchases</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Points</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
            ) : filteredCustomers.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-500">No customers found</td></tr>
            ) : (
              filteredCustomers.map(customer => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        {customer.gst_number && <p className="text-xs text-gray-500">GST: {customer.gst_number}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-sm"><Phone size={12} /> {customer.phone}</span>
                      {customer.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={12} /> {customer.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${customer.customer_type === 'wholesale' ? 'badge-info' : 'badge-success'}`}>
                      {customer.customer_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedCustomer(customer); setShowPetModal(true); }}
                      className="flex items-center gap-1 mx-auto text-purple-600 hover:underline"
                    >
                      <Heart size={14} /> {customer.pet_count || 0}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">{customer.total_orders || 0}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(customer.total_purchases)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge badge-warning">{customer.loyalty_points || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(customer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="input-field" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Type</label>
                  <select value={formData.customer_type} onChange={(e) => setFormData({...formData, customer_type: e.target.value})} className="input-field">
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Number</label>
                  <input type="text" value={formData.gst_number} onChange={(e) => setFormData({...formData, gst_number: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editingCustomer ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pet Modal */}
      {showPetModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Pet for {selectedCustomer.name}</h3>
              <button onClick={() => setShowPetModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPet} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pet Name *</label>
                  <input type="text" value={petData.name} onChange={(e) => setPetData({...petData, name: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Species *</label>
                  <select value={petData.species} onChange={(e) => setPetData({...petData, species: e.target.value})} className="input-field">
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Fish">Fish</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Breed</label>
                  <input type="text" value={petData.breed} onChange={(e) => setPetData({...petData, breed: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select value={petData.gender} onChange={(e) => setPetData({...petData, gender: e.target.value})} className="input-field">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Age (Years)</label>
                  <input type="number" value={petData.age_years} onChange={(e) => setPetData({...petData, age_years: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age (Months)</label>
                  <input type="number" value={petData.age_months} onChange={(e) => setPetData({...petData, age_months: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={petData.weight} onChange={(e) => setPetData({...petData, weight: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input type="text" value={petData.color} onChange={(e) => setPetData({...petData, color: e.target.value})} className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPetModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Add Pet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
