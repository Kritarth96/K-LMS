import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './ToastContext';
import MeteorBackground from './MeteorBackground';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const { addToast } = useToast();
  const navigate = useNavigate();
  const verifyCalled = useRef(false);
  const API_URL = ''; // Use Vite proxy

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found.');
      return;
    }

    if (verifyCalled.current) return;
    verifyCalled.current = true;

    const verifyToken = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/verify-email?token=${token}`);
        if (response.data.success) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          addToast('Email verified!', 'success');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        // If the error is "Invalid or expired token", it might mean it was ALREADY verified.
        // We can double check if the user is verified, or just improve the error message.
        // But preventing double-call with useRef usually solves the development mode issue.
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. Token may be invalid or expired.');
      }
    };

    verifyToken();
  }, []); // Remove dependencies to prevent re-running on nav/params change which shouldn't happen here exactly


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white relative overflow-hidden">
      <MeteorBackground />
      <div className="relative z-10 bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-gray-700">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Email Verification
        </h2>
        
        <div className="mb-6">
          {status === 'verifying' && (
            <div className="animate-pulse text-blue-400">Verifying...</div>
          )}
          {status === 'success' && (
            <div className="text-green-400 text-lg">✅ {message}</div>
          )}
          {status === 'error' && (
            <div className="text-red-400 text-lg">❌ {message}</div>
          )}
        </div>

        {status === 'error' && (
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 transition-all font-medium"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
