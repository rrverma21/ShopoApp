import React from 'react';
    import { Navigate } from 'react-router-dom';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    
    const SalesmanRoute = ({ children }) => {
      const { user, loading } = useAuth();
    
      if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        );
      }
    
      const userRole = user?.profile?.role;
    
      if (!user) {
        return <Navigate to="/login" replace />;
      }
    
      if (userRole !== 'salesman') {
        if (userRole === 'admin') return <Navigate to="/admin" replace />;
        if (userRole === 'seller') return <Navigate to="/seller" replace />;
        return <Navigate to="/" replace />;
      }
    
      return children;
    };
    
    export default SalesmanRoute;