import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import PersonDetail from './pages/PersonDetail';
import Login from './pages/Login';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
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
      </Routes>
    </AuthProvider>
  );
};

export default App;
