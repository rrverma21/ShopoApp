import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SellerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.profile?.role;

  if (userRole !== 'seller' && userRole !== 'admin') {
    if (userRole === 'salesman') return <Navigate to="/sales" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default SellerRoute;