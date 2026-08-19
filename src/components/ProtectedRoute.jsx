import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.profile?.role) {
    // If we're already on the profile page, don't redirect to avoid loop
    if (window.location.pathname === '/profile') {
        return children;
    }
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default ProtectedRoute;