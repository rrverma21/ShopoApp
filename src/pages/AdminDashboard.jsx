import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdminSidebar from '@/components/admin/AdminSidebar';
import LoadingFallback from '@/components/LoadingFallback';

// ----------------------------------------------------------------------
// LAZY LOADED COMPONENTS
// ----------------------------------------------------------------------

// Overview
const DashboardContent = lazy(() => import('@/components/admin/DashboardContent'));

// User Management
const CustomerPortalAccess = lazy(() => import('@/components/admin/CustomerPortalAccess'));
const SellerManagement = lazy(() => import('@/components/admin/SellerManagement'));
const ShopOwners = lazy(() => import('@/pages/admin/ShopOwners'));

// Ecommerce
const WaterProductsManagement = lazy(() => import('@/components/admin/WaterProductsManagement'));

// Growth Center (Blog)
const BlogManagement = lazy(() => import('@/components/admin/blog/BlogManagement'));
const BlogPostEditor = lazy(() => import('@/components/admin/blog/BlogPostEditor'));
const CategoryManagement = lazy(() => import('@/components/admin/blog/CategoryManagement'));

// Delivery System
const DeliveryDashboard = lazy(() => import('@/components/admin/delivery/DeliveryDashboard'));
const DeliveryRiders = lazy(() => import('@/components/admin/delivery/DeliveryRiders'));
const DeliveryBookings = lazy(() => import('@/components/admin/delivery/DeliveryBookings'));
const DeliveryPayments = lazy(() => import('@/components/admin/delivery/DeliveryPayments'));
const RiderSettlements = lazy(() => import('@/components/admin/delivery/RiderSettlements'));
const DeliveryAreas = lazy(() => import('@/components/admin/delivery/DeliveryAreas'));
const DeliveryPricing = lazy(() => import('@/components/admin/delivery/DeliveryPricing'));
const DeliveryShops = lazy(() => import('@/components/admin/delivery/DeliveryShops'));
const WaterDeliveryAreasManagement = lazy(() => import('@/components/admin/WaterDeliveryAreasManagement'));

// Contributions
const AdminProductContributions = lazy(() => import('@/pages/admin/AdminProductContributions'));
const AdminRewardPeriods = lazy(() => import('@/pages/admin/AdminRewardPeriods'));

// Marketing & Config
const CouponManagement = lazy(() => import('@/components/admin/CouponManagement'));
const MembershipPlanManagement = lazy(() => import('@/components/admin/MembershipPlanManagement'));
const LoyaltySettings = lazy(() => import('@/components/admin/LoyaltySettings'));
const VacancyManagement = lazy(() => import('@/components/admin/VacancyManagement'));
const ApplicationManagement = lazy(() => import('@/components/admin/ApplicationManagement'));
const SystemHealth = lazy(() => import('@/components/admin/SystemHealth'));
const OAuthDiagnostics = lazy(() => import('@/pages/admin/OAuthDiagnostics'));
const AdminPaymentSettings = lazy(() => import('@/components/admin/AdminPaymentSettings'));
const ManualPlanActivationPage = lazy(() => import('@/pages/admin/ManualPlanActivationPage'));
const AdminReferralPanel = lazy(() => import('@/pages/AdminReferralPanel'));

const AdminDashboard = () => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Helmet>
        <title>Admin Dashboard - ShopoApp</title>
      </Helmet>

      {/* Sidebar - Fixed Position */}
      <AdminSidebar className="z-50" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-64 h-full transition-all duration-300 ease-in-out">
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto h-full w-full custom-scrollbar">
          {/* Content Wrapper with Padding */}
          <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-[1600px] mx-auto w-full">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Overview */}
                <Route path="/" element={<DashboardContent />} />

                {/* User Management */}
                <Route path="/customer-portal-access" element={<CustomerPortalAccess />} />
                <Route path="/sellers" element={<SellerManagement />} />
                <Route path="/shop-owners" element={<ShopOwners />} />

                {/* Ecommerce */}
                <Route path="/water-products" element={<WaterProductsManagement />} />

                {/* Growth Center (Blog) */}
                <Route path="/growth-center/posts" element={<BlogManagement />} />
                <Route path="/growth-center/posts/new" element={<BlogPostEditor />} />
                <Route path="/growth-center/posts/:id/edit" element={<BlogPostEditor />} />
                <Route path="/growth-center/categories" element={<CategoryManagement />} />

                {/* Contributions */}
                <Route path="/product-contributions" element={<AdminProductContributions />} />
                <Route path="/reward-periods" element={<AdminRewardPeriods />} />

                {/* Delivery System */}
                <Route path="/delivery" element={<DeliveryDashboard />} />
                <Route path="/riders" element={<DeliveryRiders />} />
                <Route path="/bookings" element={<DeliveryBookings />} />
                <Route path="/payments" element={<DeliveryPayments />} />
                <Route path="/rider-settlements" element={<RiderSettlements />} />
                <Route path="/service-areas" element={<DeliveryAreas />} />
                <Route path="/water-delivery-areas" element={<WaterDeliveryAreasManagement />} />
                <Route path="/pricing" element={<DeliveryPricing />} />
                <Route path="/delivery-shops" element={<DeliveryShops />} />

                {/* Marketing & Config */}
                <Route path="/coupons" element={<CouponManagement />} />
                <Route path="/memberships" element={<MembershipPlanManagement />} />
                <Route path="/reward-coins" element={<LoyaltySettings />} />
                <Route path="/vacancies" element={<VacancyManagement />} />
                <Route path="/job-applications" element={<ApplicationManagement />} />
                <Route path="/system" element={<SystemHealth />} />
                <Route path="/oauth-diagnostics" element={<OAuthDiagnostics />} />
                <Route path="/payment-settings" element={<AdminPaymentSettings />} />
                <Route path="/manual-plan-activation" element={<ManualPlanActivationPage />} />
                <Route path="/referrals" element={<AdminReferralPanel />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;