import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesSummary from '@/components/admin/SalesSummary';
import SalesmanPerformance from '@/components/admin/SalesmanPerformance';
import SellerPerformance from '@/components/admin/SellerPerformance';
import RegionalAnalytics from '@/components/admin/RegionalAnalytics';
import InventoryForecasting from '@/components/admin/InventoryForecasting';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const userRole = user?.profile?.role;
  const isAdmin = userRole === 'admin';
  const isSeller = userRole === 'seller';

  const getTabsListClassName = () => {
    if (isAdmin) return 'grid w-full grid-cols-3';
    if (isSeller) return 'grid w-full grid-cols-4';
    return 'grid w-full grid-cols-1';
  };

  return (
    <div className="p-4 md:p-8">
      <Helmet>
        <title>Analytics - B2B Nexus</title>
        <meta name="description" content="Analyze sales data, regional patterns, and performance." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Growth Analytics</h1>
          <p className="text-slate-600 text-lg">Get insights on regional buying patterns, inventory forecasting, and performance dashboards.</p>
        </div>

        <Tabs defaultValue="product-sales" className="w-full">
          <TabsList className={getTabsListClassName()}>
            <TabsTrigger value="product-sales">Product Sales</TabsTrigger>
            {(isAdmin || isSeller) && (
              <TabsTrigger value="salesman-performance">Salesman Performance</TabsTrigger>
            )}
            {isSeller && (
              <>
                <TabsTrigger value="regional-patterns">Regional Patterns</TabsTrigger>
                <TabsTrigger value="inventory-forecast">Inventory Forecast</TabsTrigger>
              </>
            )}
            {isAdmin && (
              <TabsTrigger value="seller-performance">Seller Performance</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="product-sales">
            <SalesSummary />
          </TabsContent>
          {(isAdmin || isSeller) && (
            <TabsContent value="salesman-performance">
              <SalesmanPerformance />
            </TabsContent>
          )}
          {isSeller && (
            <>
              <TabsContent value="regional-patterns">
                <RegionalAnalytics />
              </TabsContent>
              <TabsContent value="inventory-forecast">
                <InventoryForecasting />
              </TabsContent>
            </>
          )}
          {isAdmin && (
            <TabsContent value="seller-performance">
              <SellerPerformance />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;