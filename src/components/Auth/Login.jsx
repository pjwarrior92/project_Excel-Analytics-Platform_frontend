import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  // 🔁 Redirect if already logged in
  useEffect(() => {
  if (localStorage.getItem('token')) {
    navigate('/dashboard');
  }
}, [navigate]); // ✅ include navigate here


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      alert('✅ Login successful');
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || '❌ Login failed');
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <form onSubmit={handleLogin} className="border p-4 rounded w-100" style={{ maxWidth: '400px' }}>
        <h2 className="mb-4 text-center">🔐 Login</h2>
        <input
          className="form-control mb-3"
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="form-control mb-3"
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
}
