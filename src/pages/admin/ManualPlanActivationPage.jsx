import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, Wrench } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminManualMembershipActivation from '@/components/admin/AdminManualMembershipActivation';

const ManualPlanActivationPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 relative">
      <AdminSidebar />
      
      <div className="flex-1 md:ml-64 p-4 md:p-8 w-full max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center text-sm font-medium text-slate-500 mb-8 pl-12 md:pl-0 animate-in fade-in slide-in-from-left-4">
          <Link to="/admin" className="hover:text-blue-600 flex items-center transition-colors px-2 py-1 rounded-md hover:bg-blue-50">
            <Home className="w-4 h-4 mr-1.5" />
            Admin Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 mx-1 text-slate-300" />
          <span className="text-slate-900 flex items-center px-2 py-1 font-bold">
            <Wrench className="w-4 h-4 mr-1.5 text-blue-600" />
            Manual Plan Activation
          </span>
        </nav>

        {/* Page Header */}
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Manual Plan Activation
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl leading-relaxed">
            Directly provision and activate membership subscriptions for accounts. Ideal for offline payments, complimentary upgrades, or administrative overrides.
          </p>
        </div>

        {/* Main Component Wrapper */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-20">
          <AdminManualMembershipActivation />
        </div>
      </div>
    </div>
  );
};

export default ManualPlanActivationPage;