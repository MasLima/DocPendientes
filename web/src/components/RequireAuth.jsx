import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return <div className="vacio">Cargando...</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}