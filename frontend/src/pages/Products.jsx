import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Search, Plus, Edit, Trash2, Package, Filter, X
} from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { selectedBranch } = useAuth();

  const [formData, setFormData] = useState({
    sku: '', barcode: '', name: '', description: '', category_id: '',
    mrp: '', selling_price: '', purchase_price: '', gst_rate: '', min_stock: '10', unit: 'piece'
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedBranch, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const params = { branch_id: selectedBranch, category: selectedCategory || undefined };
      const response = await api.get('/products', { params });
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      barcode: product.barcode || '',
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      mrp: product.mrp,
      selling_price: product.selling_price,
      purchase_price: product.purchase_price,
      gst_rate: product.gst_rate,
      min_stock: product.min_stock,
      unit: product.unit
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '', barcode: '', name: '', description: '', category_id: '',
      mrp: '', selling_price: '', purchase_price: '', gst_rate: '', min_stock: '10', unit: 'piece'
    });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => `₹${parseFloat(amount).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <button onClick={() => { resetForm(); setEditingProduct(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field w-48"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">MRP</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Selling Price</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">GST</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Stock</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8"><div className="spinner mx-auto"></div></td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-500">No products found</td></tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{product.category_icon || '📦'}</span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.barcode || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{product.sku}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-info">{product.category_name}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(product.mrp)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(product.selling_price)}</td>
                  <td className="px-4 py-3 text-center">{product.gst_rate}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${
                      product.stock <= 0 ? 'badge-danger' :
                      product.stock < product.min_stock ? 'badge-warning' : 'badge-success'
                    }`}>
                      {product.stock || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU *</label>
                  <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <input type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input-field" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={formData.category_id} onChange={(e) => {
                    const cat = categories.find(c => c.id == e.target.value);
                    setFormData({...formData, category_id: e.target.value, gst_rate: cat?.gst_rate || ''});
                  }} className="input-field" required>
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name} ({cat.gst_rate}% GST)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Rate (%)</label>
                  <input type="number" value={formData.gst_rate} onChange={(e) => setFormData({...formData, gst_rate: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">MRP *</label>
                  <input type="number" step="0.01" value={formData.mrp} onChange={(e) => setFormData({...formData, mrp: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price *</label>
                  <input type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Price</label>
                  <input type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock Level</label>
                  <input type="number" value={formData.min_stock} onChange={(e) => setFormData({...formData, min_stock: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="input-field">
                    <option value="piece">Piece</option>
                    <option value="pack">Pack</option>
                    <option value="bottle">Bottle</option>
                    <option value="tube">Tube</option>
                    <option value="kg">Kilogram</option>
                    <option value="dose">Dose</option>
                    <option value="set">Set</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editingProduct ? 'Update' : 'Create'} Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
