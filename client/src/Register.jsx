import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
        await axios.post('http://localhost:5000/api/register', form);
        alert("Registration Successful! Please Login.");
        navigate('/login');
    } catch (err) {
        alert("Error registering. Email might be in use.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-indigo-900">Student Sign Up</h2>
            <form onSubmit={handleRegister} className="space-y-4">
                <input placeholder="Full Name" className="w-full p-3 border rounded" onChange={e => setForm({...form, name: e.target.value})} required />
                <input type="email" placeholder="Email Address" className="w-full p-3 border rounded" onChange={e => setForm({...form, email: e.target.value})} required />
                <input type="password" placeholder="Password" className="w-full p-3 border rounded" onChange={e => setForm({...form, password: e.target.value})} required />
                <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700">Register</button>
            </form>
            <p className="text-center mt-4 text-sm">Already have an account? <Link to="/login" className="text-indigo-600 font-bold">Login</Link></p>
        </div>
    </div>
  );
}