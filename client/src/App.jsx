import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import PersonDetail from './pages/PersonDetail';
import Login from './pages/Login';
import Evaluation from './pages/Evaluation';
import { AnimatePresence } from 'framer-motion';

import { Toaster } from 'react-hot-toast';

const App = () => {
  const location = useLocation();

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#030712] selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden">
        {/* Global Background Effects */}
        <div className="bg-blob top-[-10%] left-[-10%] animate-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%)' }} />
        <div className="bg-blob bottom-[-10%] right-[-10%] animate-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0) 70%)' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />

        <Toaster position="bottom-right" toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }} />
        
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/person/:id" element={
              <ProtectedRoute>
                <PersonDetail />
              </ProtectedRoute>
            } />
            <Route path="/evaluation" element={
              <ProtectedRoute>
                <Evaluation />
              </ProtectedRoute>
            } />
          </Routes>
        </AnimatePresence>
      </div>
    </AuthProvider>
  );
};

export default App;
