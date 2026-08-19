import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Helmet } from 'react-helmet-async';
import { FileSpreadsheet, ShieldCheck, DownloadCloud, FileText, Receipt } from 'lucide-react';
import PaidPurchasesSection from '@/components/pos/gst/PaidPurchasesSection';
import OtherBusinessExpensesSection from '@/components/pos/gst/OtherBusinessExpensesSection';
import SalesOverviewSection from '@/components/pos/gst/SalesOverviewSection';

// Placeholder for existing components to keep the file fully self-contained as requested
const ReportsPlaceholder = () => (
    <Card>
        <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
            <CardDescription>Export your data for accounting and filing.</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground border-t">
            <DownloadCloud className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Report generation available.</p>
        </CardContent>
    </Card>
);

const GSTSettingsPlaceholder = () => (
    <Card>
        <CardHeader>
            <CardTitle>GST Configuration</CardTitle>
            <CardDescription>Manage your GSTIN, tax rates, and invoice settings.</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground border-t">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Settings module loaded.</p>
        </CardContent>
    </Card>
);

const SellerGSTToolkit = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('sales');

    console.log('[SellerGSTToolkit] Rendering with activeTab:', activeTab, 'user:', user?.id);

    if (!user) {
        console.warn('[SellerGSTToolkit] No user found');
        return null;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6 pb-24">
            <Helmet>
                <title>Tax Tools| Retailer POS</title>
                <meta name="description" content="Manage your GST filing data, input tax credits, and sales reports." />
            </Helmet>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Tax Tools</h1>
                <p className="text-muted-foreground">Comprehensive dashboard for managing tax compliance, purchases, and reporting.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
                    <TabsTrigger value="sales" className="flex items-center gap-2">
                        <FileText className="w-4 h-4 hidden sm:block" /> Sales
                    </TabsTrigger>
                    <TabsTrigger value="purchases" className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 hidden sm:block" /> Purchase
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 hidden sm:block" /> Other Expenses
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="sales" className="animate-in fade-in-50 duration-500">
                    <SalesOverviewSection />
                </TabsContent>
                
                <TabsContent value="purchases" className="animate-in fade-in-50 duration-500">
                    <PaidPurchasesSection />
                </TabsContent>

                <TabsContent value="expenses" className="animate-in fade-in-50 duration-500">
                    <OtherBusinessExpensesSection />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SellerGSTToolkit;