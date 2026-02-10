import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const res = await axios.post('http://localhost:5000/api/login', form);
        if(res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user)); // Save user session
            alert("Welcome back, " + res.data.user.name);
            navigate(res.data.user.role === 'admin' ? '/admin' : '/');
        }
    } catch (err) {
        alert("Invalid Credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-indigo-900">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" placeholder="Email" className="w-full p-3 border rounded" onChange={e => setForm({...form, email: e.target.value})} required />
                <input type="password" placeholder="Password" className="w-full p-3 border rounded" onChange={e => setForm({...form, password: e.target.value})} required />
                <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700">Login</button>
            </form>
            <p className="text-center mt-4 text-sm">New here? <Link to="/register" className="text-indigo-600 font-bold">Create Account</Link></p>
        </div>
    </div>
  );
}