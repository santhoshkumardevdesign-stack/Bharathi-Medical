import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          {/* Logo */}
          <div className="w-40 h-40 mb-6 bg-white rounded-full flex items-center justify-center shadow-xl overflow-hidden">
            <img src="/images/bharathiyar.png" alt="Bharathi Medicals" className="w-36 h-36 object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="hidden text-6xl">🐾</div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Bharathi Medicals</h1>
          <p className="text-lg text-white/80 text-center max-w-md mb-2">
            Vet & Pet Shop
          </p>
          <p className="text-sm text-white/60 text-center max-w-md">
            Quality Pet Products at Affordable Prices
          </p>
          <div className="mt-10 flex gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold">8</div>
              <div className="text-white/60 text-sm">Branches</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">1000+</div>
              <div className="text-white/60 text-sm">Products</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">5000+</div>
              <div className="text-white/60 text-sm">Customers</div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full"></div>
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full"></div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
              <img src="/images/bharathiyar.png" alt="Bharathi Medicals" className="w-20 h-20 object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <div className="hidden text-5xl">🐾</div>
            </div>
            <h1 className="text-3xl font-bold text-green-700">Bharathi Medicals</h1>
            <p className="text-sm text-gray-500">Vet & Pet Shop</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Welcome Back!</h2>
              <p className="text-gray-500 mt-2">Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Demo Credentials:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Admin:</p>
                  <p className="font-mono">admin / admin123</p>
                </div>
                <div>
                  <p className="text-gray-500">Cashier:</p>
                  <p className="font-mono">cashier1 / cashier123</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            © 2024 Bharathi Medicals. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
