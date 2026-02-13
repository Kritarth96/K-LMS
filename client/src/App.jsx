import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import CoursePlayer from './CoursePlayer';
import Admin from './Admin';
import Dashboard from './Dashboard';
import Register from './Register';
import Login from './Login';
import VerifyEmail from './VerifyEmail';
import ErrorBoundary from './ErrorBoundary';
import ProtectedRoute from './ProtectedRoute';
import { ToastProvider } from './ToastContext';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/course/:id" element={<CoursePlayer />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;