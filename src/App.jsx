import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CartProvider } from '@/contexts/CartContext';
import { PosDataProvider } from '@/contexts/PosDataContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { POSModeProvider } from '@/contexts/POSModeContext';
import { QuotationProvider } from '@/contexts/QuotationContext';
import { MembershipProvider } from '@/contexts/MembershipContext';
import { Toaster } from '@/components/ui/toaster';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegionProvider } from '@/contexts/RegionContext';
import { normalizeProfileRole } from '@/lib/profileRoles';

import 'react-day-picker/dist/style.css';

// Core Layout Components
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InstallPWA from '@/components/InstallPWA';
import SEO from '@/components/SEO';
import LoadingFallback from '@/components/LoadingFallback';

// Route Guards
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import SellerRoute from '@/components/SellerRoute';
import SalesmanRoute from '@/components/SalesmanRoute';
import ProtectedRetailerRoute from '@/components/retailer/ProtectedRetailerRoute';
import FeatureGuard from '@/components/FeatureGuard'; 
import MembershipGuard from '@/components/MembershipGuard';

// Lazy Loaded Pages - Public
const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductDetailsPage = lazy(() => import('@/pages/ProductDetailsPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SellerSignupPage = lazy(() => import('@/pages/SellerSignupPage'));
const MembershipPage = lazy(() => import('@/pages/MembershipPage'));
const MembershipPlansPage = lazy(() => import('@/pages/MembershipPlansPage'));
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentSuccessPage'));
const PaymentFailurePage = lazy(() => import('@/pages/PaymentFailurePage'));
const PaymentCancelledPage = lazy(() => import('@/pages/PaymentCancelledPage'));
const JoinUsPage = lazy(() => import('@/pages/JoinUsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const RefundCancellationPolicy = lazy(() => import('@/pages/RefundCancellationPolicy'));
const PaymentPolicyPage = lazy(() => import('@/pages/PaymentPolicyPage'));
const ShippingPolicyPage = lazy(() => import('@/pages/ShippingPolicyPage'));
const DisputeResolutionPage = lazy(() => import('@/pages/DisputeResolutionPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const VerifyOtpPage = lazy(() => import('@/pages/VerifyOtpPage'));
const VerifiedPage = lazy(() => import('@/pages/VerifiedPage')); 
const BulkOrderPage = lazy(() => import('@/pages/BulkOrderPage'));
const LocalShopsPage = lazy(() => import('@/pages/LocalShopsPage'));
const MyPosOrdersPage = lazy(() => import('@/pages/MyPosOrdersPage'));
const CustomerPurchaseHistory = lazy(() => import('@/pages/CustomerPurchaseHistory'));
const RiderSignupPage = lazy(() => import('@/pages/RiderSignupPage'));
const WaterOrderPage = lazy(() => import('@/pages/WaterOrderPage'));
const RetailerToolsPage = lazy(() => import('@/pages/RetailerToolsPage'));
const ReferralDashboard = lazy(() => import('@/pages/ReferralDashboard'));
const ShopoConnectPage = lazy(() => import('@/pages/ShopoConnectPage'));

// Forms Demo
const AddressFormDemo = lazy(() => import('@/pages/AddressFormDemo'));

// Lazy Loaded Feature Pages
const PosBillingPage = lazy(() => import('@/pages/features/PosBillingPage'));
const InventoryManagementPage = lazy(() => import('@/pages/features/InventoryManagementPage'));
const OnlineShopPage = lazy(() => import('@/pages/features/OnlineShopPage'));
const CustomerManagementPage = lazy(() => import('@/pages/features/CustomerManagementPage'));
const CreditManagementPage = lazy(() => import('@/pages/features/CreditManagementPage'));
const GstRegisterPage = lazy(() => import('@/pages/features/GstRegisterPage'));
const EmployeeManagementPage = lazy(() => import('@/pages/features/EmployeeManagementPage'));
const SmartReorderingPage = lazy(() => import('@/pages/features/SmartReorderingPage'));

// Lazy Loaded Pages - POS
const PosDashboard = lazy(() => import('@/pages/pos/PosDashboard'));
const PointOfSale = lazy(() => import('@/components/pos/PointOfSale'));
const PosProducts = lazy(() => import('@/components/pos/PosProducts'));
const PosOrders = lazy(() => import('@/components/pos/PosOrders'));
const PosCustomers = lazy(() => import('@/components/pos/PosCustomers'));
const PosReports = lazy(() => import('@/components/pos/PosReports'));
const PosAnalytics = lazy(() => import('@/components/pos/PosAnalytics'));
const PosSettingsPage = lazy(() => import('@/pages/pos/PosSettingsPage')); 
const PaymentSettingsPage = lazy(() => import('@/pages/pos/PaymentSettingsPage')); 
const PosSmartReorder = lazy(() => import('@/components/pos/PosSmartReorder'));
const PosCredit = lazy(() => import('@/components/pos/PosCredit'));
const PosRefunds = lazy(() => import('@/components/pos/PosRefunds'));
const PosPendingPayments = lazy(() => import('@/components/pos/PosPendingPayments'));
const AttendanceTracker = lazy(() => import('@/pages/pos/AttendanceTracker'));
const AttendanceQRScanner = lazy(() => import('@/pages/pos/AttendanceQRScanner'));
const EmployeeManagement = lazy(() => import('@/pages/pos/EmployeeManagement'));
const EmployeeDetails = lazy(() => import('@/pages/pos/EmployeeDetails'));
const EmployeeForm = lazy(() => import('@/pages/pos/EmployeeForm'));
const PaymentManagement = lazy(() => import('@/pages/pos/PaymentManagement'));
const SalarySlips = lazy(() => import('@/pages/pos/SalarySlips'));
const LeaveManagement = lazy(() => import('@/pages/pos/LeaveManagement'));
const PerformanceRatings = lazy(() => import('@/pages/pos/PerformanceRatings'));
const PosInsights = lazy(() => import('@/pages/pos/PosInsights'));
const DigitalShop = lazy(() => import('@/pages/pos/DigitalShop'));
const DigitalShopCheckout = lazy(() => import('@/pages/pos/DigitalShopCheckout'));
const WaterOrdersDashboard = lazy(() => import('@/pages/pos/WaterOrdersDashboard'));
const InvoiceView = lazy(() => import('@/pages/pos/InvoiceView'));
const PurchaseBillEntry = lazy(() => import('@/pages/pos/PurchaseBillEntry'));
const PrintLabelsPage = lazy(() => import('@/pages/pos/PrintLabelsPage')); 
const SellerGSTToolkit = lazy(() => import('@/pages/pos/SellerGSTToolkit')); 
const HSNMasterManagement = lazy(() => import('@/pages/pos/HSNMasterManagement'));
const BookOrdersPage = lazy(() => import('@/pages/pos/BookOrdersPage'));

// Quotations Pages
const QuotationsListPage = lazy(() => import('@/pages/pos/QuotationsListPage'));
const CreateQuotationPage = lazy(() => import('@/pages/pos/CreateQuotationPage'));
const EditQuotationPage = lazy(() => import('@/pages/pos/EditQuotationPage'));
const QuotationViewPage = lazy(() => import('@/pages/pos/QuotationViewPage'));

// Lazy Loaded Pages - Admin & Retailer & Delivery
const AdminWaterOrders = lazy(() => import('@/pages/admin/AdminWaterOrders'));
const AdminProductContributions = lazy(() => import('@/pages/admin/AdminProductContributions'));
const AdminRewardPeriods = lazy(() => import('@/pages/admin/AdminRewardPeriods'));
const ManualPlanActivationPage = lazy(() => import('@/pages/admin/ManualPlanActivationPage'));
const AdminReferralPanel = lazy(() => import('@/pages/AdminReferralPanel'));

const RetailerDashboard = lazy(() => import('@/pages/retailer/RetailerDashboard'));
const RetailerLoginPage = lazy(() => import('@/pages/retailer/RetailerLoginPage'));
const RetailerSignupPage = lazy(() => import('@/pages/retailer/RetailerSignupPage'));
const PublicShopPage = lazy(() => import('@/pages/PublicShopPage'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const OrderTracking = lazy(() => import('@/pages/OrderTracking'));
const OrderHistory = lazy(() => import('@/pages/OrderHistory'));
const BookDeliveryPage = lazy(() => import('@/pages/delivery/BookDeliveryPage'));
const MyDeliveriesPage = lazy(() => import('@/pages/delivery/MyDeliveriesPage'));
const RiderDashboardPage = lazy(() => import('@/pages/delivery/RiderDashboardPage'));
const RiderEarningsPage = lazy(() => import('@/pages/delivery/RiderEarningsPage'));
const RiderProfilePage = lazy(() => import('@/pages/delivery/RiderProfilePage'));
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'));
const GoogleOAuthCallback = lazy(() => import('@/pages/GoogleOAuthCallback')); 
const SitemapPage = lazy(() => import('@/pages/SitemapPage'));

// Promotions Pages
const PromotionsPage = lazy(() => import('@/pages/promotions/PromotionsPage'));
const OfferForm = lazy(() => import('@/pages/promotions/OfferForm'));
const OffersList = lazy(() => import('@/pages/promotions/OffersList'));
const AnalyticsDashboard = lazy(() => import('@/pages/promotions/AnalyticsDashboard'));
const ShareOffer = lazy(() => import('@/pages/promotions/ShareOffer'));
const PublicOfferPage = lazy(() => import('@/pages/promotions/PublicOfferPage'));

// Phase 2 Promotions Pages
const BroadcastPage = lazy(() => import('@/pages/promotions/BroadcastPage'));
const AdvancedAnalyticsDashboard = lazy(() => import('@/pages/promotions/AdvancedAnalyticsDashboard'));
const ScheduleManager = lazy(() => import('@/pages/promotions/ScheduleManager'));
const ABTestingPage = lazy(() => import('@/pages/promotions/ABTestingPage'));
const SegmentationPage = lazy(() => import('@/pages/promotions/SegmentationPage'));
const OfferTemplates = lazy(() => import('@/pages/promotions/OfferTemplates'));

// Growth Center Admin
const BlogManagement = lazy(() => import('@/components/admin/blog/BlogManagement'));
const BlogPostEditor = lazy(() => import('@/components/admin/blog/BlogPostEditor'));
const CategoryManagement = lazy(() => import('@/components/admin/blog/CategoryManagement'));

// Public Growth Center Pages
const GrowthCenterLandingPage = lazy(() => import('@/pages/growth-center/GrowthCenterLandingPage'));
const BlogDetailPage = lazy(() => import('@/pages/growth-center/BlogDetailPage'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const RouteSEO = ({ children, title, description }) => {
    return (
        <>
            <SEO title={title} description={description} />
            {children}
        </>
    );
};

const MainLayout = ({ children }) => (
  <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900">
    <Header />
    <main className="flex-1 overflow-y-auto pt-16 w-full custom-scrollbar">
      <Suspense fallback={<LoadingFallback message="Loading page..." />}>
        {children}
      </Suspense>
      <Footer />
    </main>
    <InstallPWA />
  </div>
);

const AppRoutes = () => {
    const { loading, error, user } = useAuth();
    const location = useLocation();

    if (loading || error) {
        return <LoadingFallback message="Verifying session..." error={error} />;
    }

    const getDashboardPath = () => {
        if (!user || !user.profile) return '/login';
        switch (normalizeProfileRole(user.profile.role)) {
            case 'admin': return '/admin';
            case 'seller': return '/pos/point-of-sale'; 
            case 'salesman': return '/sales';
            case 'rider': return '/rider/dashboard';
            case 'customer': return '/local-shops'; 
            default: return '/profile'; 
        }
    };

    return (
        <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingFallback message="Loading content..." />}>
                <Routes key={location.pathname}>
                    {/* Public Routes with SEO */}
                    <Route path="/" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><RetailerToolsPage /></MainLayout></RouteSEO>} />
                    <Route path="/login" element={<RouteSEO title="Login"><MainLayout><LoginPage /></MainLayout></RouteSEO>} />
                    <Route path="/signup" element={<RouteSEO title="Sign Up"><MainLayout><SignupPage /></MainLayout></RouteSEO>} />
                    <Route path="/forgot-password" element={<RouteSEO title="Forgot Password"><MainLayout><ForgotPasswordPage /></MainLayout></RouteSEO>} />
                    <Route path="/reset-password" element={<RouteSEO title="Reset Password"><MainLayout><ResetPasswordPage /></MainLayout></RouteSEO>} />
                    
                    {/* ShopoConnect Community */}
                    <Route path="/shopo-connect" element={<RouteSEO title="ShopoConnect | ShopoApp Community Market & Social Commerce"><MainLayout><ShopoConnectPage /></MainLayout></RouteSEO>} />
                    
                    {/* Payment Result Pages */}
                    <Route path="/membership-success" element={<MainLayout><ProtectedRoute><PaymentSuccessPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/membership-failure" element={<MainLayout><ProtectedRoute><PaymentFailurePage /></ProtectedRoute></MainLayout>} />
                    <Route path="/payment-success" element={<MainLayout><PaymentSuccessPage /></MainLayout>} />
                    <Route path="/payment-failure" element={<MainLayout><PaymentFailurePage /></MainLayout>} />

                    {/* B2B & Seller Pages */}
                    <Route path="/seller-signup" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><SellerSignupPage /></MainLayout></RouteSEO>} />
                    <Route path="/become-supplier" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><SellerSignupPage /></MainLayout></RouteSEO>} />
                    <Route path="/retailer-tools" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><RetailerToolsPage /></MainLayout></RouteSEO>} />
                    
                    {/* Features Pages */}
                    <Route path="/features/pos-billing" element={<RouteSEO title="Advanced POS Billing"><MainLayout><PosBillingPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/inventory-management" element={<RouteSEO title="Inventory Management"><MainLayout><InventoryManagementPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/online-shop" element={<RouteSEO title="Online Shop"><MainLayout><OnlineShopPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/customer-management" element={<RouteSEO title="Customer Management"><MainLayout><CustomerManagementPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/credit-management" element={<RouteSEO title="Credit Management"><MainLayout><CreditManagementPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/gst-register" element={<RouteSEO title="GST Register"><MainLayout><GstRegisterPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/employee-management" element={<RouteSEO title="Employee Management"><MainLayout><EmployeeManagementPage /></MainLayout></RouteSEO>} />
                    <Route path="/features/smart-reordering" element={<RouteSEO title="Smart Re-ordering"><MainLayout><SmartReorderingPage /></MainLayout></RouteSEO>} />
                    
                    <Route path="/rider-signup" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><RiderSignupPage /></MainLayout></RouteSEO>} />
                    <Route path="/products" element={<RouteSEO title="Wholesale Market"><MainLayout><ProductsPage /></MainLayout></RouteSEO>} />
                    <Route path="/product/:id" element={<RouteSEO title="Product Details"><MainLayout><ProductDetailsPage /></MainLayout></RouteSEO>} />
                    
                    <Route path="/local-shops" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><LocalShopsPage /></MainLayout></RouteSEO>} />
                    
                    <Route path="/water-order" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><WaterOrderPage /></MainLayout></RouteSEO>} />
                    
                    {/* OAuth Callback Route */}
                    <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
                    <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
                    
                    {/* Dedicated Admin Routes */}
                    <Route path="/admin/water-orders" element={<AdminRoute><RouteSEO title="Water Orders Management"><MainLayout><AdminWaterOrders /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/product-contributions" element={<AdminRoute><RouteSEO title="Product Contributions"><MainLayout><AdminProductContributions /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/reward-periods" element={<AdminRoute><RouteSEO title="Reward Periods"><MainLayout><AdminRewardPeriods /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/manual-plan-activation" element={<AdminRoute><RouteSEO title="Manual Plan Activation"><MainLayout><ManualPlanActivationPage /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/referrals" element={<AdminRoute><RouteSEO title="Referral Management"><MainLayout><AdminReferralPanel /></MainLayout></RouteSEO></AdminRoute>} />

                    {/* Growth Center Admin Routes */}
                    <Route path="/admin/growth-center" element={<AdminRoute><RouteSEO title="Growth Center Admin"><MainLayout><BlogManagement /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/growth-center/posts" element={<AdminRoute><RouteSEO title="Manage Posts"><MainLayout><BlogManagement /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/growth-center/posts/new" element={<AdminRoute><RouteSEO title="New Post"><MainLayout><BlogPostEditor /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/growth-center/posts/:id/edit" element={<AdminRoute><RouteSEO title="Edit Post"><MainLayout><BlogPostEditor /></MainLayout></RouteSEO></AdminRoute>} />
                    <Route path="/admin/growth-center/categories" element={<AdminRoute><RouteSEO title="Manage Categories"><MainLayout><CategoryManagement /></MainLayout></RouteSEO></AdminRoute>} />

                    {/* Public Growth Center / Blog Routes */}
                    <Route path="/growth-center" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><GrowthCenterLandingPage /></MainLayout></RouteSEO>} />
                    <Route path="/growth-center/:slug" element={<MainLayout><BlogDetailPage /></MainLayout>} />

                    {/* Customer Receipt Portal */}
                    <Route path="/my-purchases" element={<MainLayout><CustomerPurchaseHistory /></MainLayout>} />
                    <Route path="/customer-purchase-history" element={<MainLayout><CustomerPurchaseHistory /></MainLayout>} />
                    
                    {/* Digital Shop & Checkout Routes */}
                    <Route path="/shop/:retailerId" element={<RouteSEO title="Digital Shop"><DigitalShop /></RouteSEO>} />
                    <Route path="/shop/:retailerId/checkout" element={<DigitalShopCheckout />} />
                    <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
                    <Route path="/order-confirmation" element={<OrderConfirmation />} />
                    <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
                    
                    <Route path="/join-us" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><JoinUsPage /></MainLayout></RouteSEO>} />
                    <Route path="/about" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><AboutPage /></MainLayout></RouteSEO>} />
                    <Route path="/terms-of-service" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><TermsOfService /></MainLayout></RouteSEO>} />
                    <Route path="/terms" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><TermsOfService /></MainLayout></RouteSEO>} />
                    <Route path="/privacy-policy" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><PrivacyPolicyPage /></MainLayout></RouteSEO>} />
                    <Route path="/privacy" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><PrivacyPolicyPage /></MainLayout></RouteSEO>} />
                    <Route path="/refund-cancellation-policy" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><RefundCancellationPolicy /></MainLayout></RouteSEO>} />
                    <Route path="/refund-policy" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><RefundCancellationPolicy /></MainLayout></RouteSEO>} />
                    
                    <Route path="/payment-policy" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><PaymentPolicyPage /></MainLayout></RouteSEO>} />
                    <Route path="/shipping-policy" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><ShippingPolicyPage /></MainLayout></RouteSEO>} />
                    <Route path="/dispute-resolution" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><DisputeResolutionPage /></MainLayout></RouteSEO>} />
                    <Route path="/contact" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><ContactPage /></MainLayout></RouteSEO>} />

                    <Route path="/faq" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><FAQ /></MainLayout></RouteSEO>} />
                    <Route path="/verify-otp" element={<MainLayout><VerifyOtpPage /></MainLayout> } />
                    <Route path="/verified" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><VerifiedPage /></MainLayout></RouteSEO>} />
                    
                    <Route path="/retailer-login" element={<RouteSEO title="Retailer Login"><RetailerLoginPage /></RouteSEO>} />
                    <Route path="/retailer-signup" element={<RouteSEO title="Retailer Signup"><RetailerSignupPage /></RouteSEO>} />

                    {/* Sitemap Route */}
                    <Route path="/sitemap-generator" element={<SitemapPage />} />

                    {/* Print Labels Route */}
                    <Route path="/print-labels" element={<MainLayout><ProtectedRoute><PrintLabelsPage /></ProtectedRoute></MainLayout>} />
                    
                    {/* Forms Demo Route */}
                    <Route path="/address-demo" element={<MainLayout><AddressFormDemo /></MainLayout>} />

                    {/* Book Orders Top-Level Route */}
                    <Route path="/book-orders" element={
                        <RouteSEO title="Book Orders">
                            <MainLayout>
                                <BookOrdersPage />
                            </MainLayout>
                        </RouteSEO>
                    } />

                    {/* DIOR Routes */}
                    <Route path="/dior/*" element={
                        <ProtectedRetailerRoute>
                            <FeatureGuard feature="DIOR">
                                <RetailerDashboard />
                            </FeatureGuard>
                        </ProtectedRetailerRoute>
                    } />
                    
                    {/* POS Routes */}
                    <Route path="/pos" element={
                        <ProtectedRoute>
                            <FeatureGuard feature="POS">
                                <PosDashboard />
                            </FeatureGuard>
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="point-of-sale" replace />} />
                        <Route path="dashboard" element={<PosInsights />} />
                        <Route path="point-of-sale" element={<PointOfSale />} />
                        <Route path="products" element={<MembershipGuard><PosProducts /></MembershipGuard>} />
                        <Route path="purchase-bill-entry" element={<PurchaseBillEntry />} />
                        <Route path="quotations" element={<SellerRoute><QuotationsListPage /></SellerRoute>} />
                        <Route path="quotations/create" element={<SellerRoute><CreateQuotationPage /></SellerRoute>} />
                        <Route path="quotations/:id" element={<SellerRoute><QuotationViewPage /></SellerRoute>} />
                        <Route path="quotations/:id/edit" element={<SellerRoute><EditQuotationPage /></SellerRoute>} />
                        <Route path="orders" element={<PosOrders />} />
                        <Route path="customers" element={<PosCustomers />} />
                        <Route path="reports" element={<PosReports />} />
                        <Route path="analytics" element={<PosAnalytics />} />
                        <Route path="settings" element={<PosSettingsPage />} />
                        <Route path="payment-settings" element={<PaymentSettingsPage />} /> 
                        <Route path="smart-reorder" element={<PosSmartReorder />} />
                        <Route path="credit" element={<PosCredit />} />
                        <Route path="pending-payments" element={<PosPendingPayments />} />
                        <Route path="refunds" element={<PosRefunds />} />
                        <Route path="attendance-tracker" element={<AttendanceTracker />} />
                        <Route path="attendance-qr-scanner" element={<AttendanceQRScanner />} />
                        <Route path="employees" element={<EmployeeManagement />} />
                        <Route path="employees/new" element={<EmployeeForm />} />
                        <Route path="employees/:id" element={<EmployeeDetails />} />
                        <Route path="employees/:id/edit" element={<EmployeeForm />} />
                        <Route path="employees/:id/payments" element={<PaymentManagement />} />
                        <Route path="employees/:id/salary-slips" element={<SalarySlips />} />
                        <Route path="employees/:id/leaves" element={<LeaveManagement />} />
                        <Route path="employees/:id/performance" element={<PerformanceRatings />} />
                        <Route path="digital-shop" element={<DigitalShop />} />
                        <Route path="digital-shop-checkout" element={<DigitalShopCheckout />} />
                        <Route path="water-orders" element={<WaterOrdersDashboard />} />
                        <Route path="invoice/:invoiceId" element={<InvoiceView />} />
                        <Route path="purchase-bill-entry" element={<PurchaseBillEntry />} />
                        <Route path="gst-toolkit" element={<SellerRoute><SellerGSTToolkit /></SellerRoute>} />
                        <Route path="hsn-master" element={<SellerRoute><HSNMasterManagement /></SellerRoute>} />
                    </Route>

                    {/* Delivery Routes */}
                    <Route path="/delivery/book" element={<MainLayout><ProtectedRoute><BookDeliveryPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/delivery-booking" element={<MainLayout><ProtectedRoute><BookDeliveryPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/delivery/my-bookings" element={<MainLayout><ProtectedRoute><MyDeliveriesPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/my-deliveries" element={<MainLayout><ProtectedRoute><MyDeliveriesPage /></ProtectedRoute></MainLayout>} />
                    
                    {/* Rider Routes */}
                    <Route path="/rider/dashboard" element={<MainLayout><ProtectedRoute><RiderDashboardPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/rider-dashboard" element={<MainLayout><ProtectedRoute><RiderDashboardPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/rider/earnings" element={<MainLayout><ProtectedRoute><RiderEarningsPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/rider-earnings" element={<MainLayout><ProtectedRoute><RiderEarningsPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/rider/profile" element={<MainLayout><ProtectedRoute><RiderProfilePage /></ProtectedRoute></MainLayout>} />
                    <Route path="/rider-profile" element={<MainLayout><ProtectedRoute><RiderProfilePage /></ProtectedRoute></MainLayout>} />

                    {/* Customer Dashboard */}
                    <Route path="/customer/dashboard" element={<MainLayout><ProtectedRoute><CustomerDashboard /></ProtectedRoute></MainLayout>} />

                    {/* Protected Routes */}
                    <Route path="/cart" element={<MainLayout><ProtectedRoute><CartPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/orders" element={<MainLayout><ProtectedRoute><OrdersPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/my-orders" element={<MainLayout><ProtectedRoute><OrdersPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/order-history" element={<MainLayout><ProtectedRoute><OrderHistory /></ProtectedRoute></MainLayout>} />
                    <Route path="/my-shop-orders" element={<MainLayout><ProtectedRoute><MyPosOrdersPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/my-pos-orders" element={<MainLayout><ProtectedRoute><MyPosOrdersPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/profile" element={<MainLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></MainLayout>} />
                    <Route path="/membership" element={<MainLayout><ProtectedRoute><MembershipPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/membership-plans" element={<MainLayout><ProtectedRoute><MembershipPlansPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/payment-cancelled" element={<MainLayout><ProtectedRoute><PaymentCancelledPage /></ProtectedRoute></MainLayout>} />
                    <Route path="/bulk-order" element={<RouteSEO title="Bulk Order"><MainLayout><ProtectedRoute><BulkOrderPage /></ProtectedRoute></MainLayout></RouteSEO>} />
                    <Route path="/referral-dashboard" element={<RouteSEO title="Referrals"><MainLayout><ProtectedRoute><ReferralDashboard /></ProtectedRoute></MainLayout></RouteSEO>} />
                    
                    <Route path="/dashboard" element={<ProtectedRoute><Navigate to={getDashboardPath()} replace /></ProtectedRoute>} />

                     {/* Admin Dashboard */}
                    <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    
                    {/* Seller Dashboard */}
                    <Route path="/seller/*" element={<SellerRoute><Navigate to="/pos/point-of-sale" replace /></SellerRoute>} />

                    {/* Salesman Dashboard */}
                    <Route path="/sales/*" element={<SalesmanRoute><AdminDashboard /></SalesmanRoute>} />

                    {/* Promotions Routes */}
                    <Route path="/promotions" element={<SellerRoute><RouteSEO title="Promotions"><MainLayout><PromotionsPage /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/create" element={<SellerRoute><RouteSEO title="Create Promotion"><MainLayout><OfferForm /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/offers" element={<SellerRoute><RouteSEO title="Manage Offers"><MainLayout><OffersList /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/analytics" element={<SellerRoute><RouteSEO title="Promotion Analytics"><MainLayout><AnalyticsDashboard /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/share" element={<SellerRoute><RouteSEO title="Share Offer"><MainLayout><ShareOffer /></MainLayout></RouteSEO></SellerRoute>} />
                    
                    {/* Phase 2 Promotions Routes */}
                    <Route path="/promotions/broadcast" element={<SellerRoute><RouteSEO title="Broadcast"><MainLayout><BroadcastPage /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/advanced-analytics" element={<SellerRoute><RouteSEO title="Advanced Analytics"><MainLayout><AdvancedAnalyticsDashboard /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/schedule" element={<SellerRoute><RouteSEO title="Schedule Promotions"><MainLayout><ScheduleManager /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/ab-testing" element={<SellerRoute><RouteSEO title="A/B Testing"><MainLayout><ABTestingPage /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/segments" element={<SellerRoute><RouteSEO title="Customer Segments"><MainLayout><SegmentationPage /></MainLayout></RouteSEO></SellerRoute>} />
                    <Route path="/promotions/templates" element={<SellerRoute><RouteSEO title="Offer Templates"><MainLayout><OfferTemplates /></MainLayout></RouteSEO></SellerRoute>} />

                    <Route path="/offer/:code" element={<RouteSEO title="Special Offer"><MainLayout><PublicOfferPage /></MainLayout></RouteSEO>} />

                    <Route path="*" element={<RouteSEO title="ShopoApp | Smart POS Billing, Inventory & Taxation Software"><MainLayout><NotFoundPage /></MainLayout></RouteSEO>} />
                </Routes>
            </Suspense>
        </AnimatePresence>
    );
};

function App() {
  useEffect(() => {
    const removeSplash = () => {
      const splashScreen = document.getElementById('splash-screen');
      if (splashScreen) {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
          if (splashScreen.parentNode) {
            splashScreen.parentNode.removeChild(splashScreen);
            document.body.style.overflow = '';
          }
        }, 600);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(removeSplash);
    } else {
      setTimeout(removeSplash, 100);
    }
  }, []);

  return (
      <HelmetProvider>
        <LanguageProvider> 
          <ThemeProvider>
            <AuthProvider>
              <RegionProvider>
                <QueryClientProvider client={queryClient}>
                  <MembershipProvider>
                    <POSModeProvider>
                        <PosDataProvider>
                        <CartProvider>
                          <QuotationProvider>
                            <div className="flex flex-col h-dvh overflow-hidden bg-background text-foreground">
                                <AppRoutes />
                            </div>
                            <Toaster />
                          </QuotationProvider>
                        </CartProvider>
                        </PosDataProvider>
                    </POSModeProvider>
                  </MembershipProvider>
                </QueryClientProvider>
              </RegionProvider>
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </HelmetProvider>
  );
}

export default App;
