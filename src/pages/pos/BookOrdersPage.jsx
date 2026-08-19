import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, List, PlusCircle, PackageX, RotateCcw } from 'lucide-react';
import BookOrderList from '@/components/pos/book-orders/BookOrderList';
import BookOrderForm from '@/components/pos/book-orders/BookOrderForm';
import ReturnOrderList from '@/components/pos/book-orders/ReturnOrderList';
import ReturnOrderForm from '@/components/pos/book-orders/ReturnOrderForm';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const BookOrdersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");
  const [editingOrder, setEditingOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [returnsRefreshCounter, setReturnsRefreshCounter] = useState(0);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('booked_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching booked orders:', error);
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleEdit = (order) => {
    setEditingOrder(order);
    setActiveTab("new");
  };

  const handleSaveOrCancel = () => {
    setEditingOrder(null);
    setActiveTab("list");
    fetchOrders(); // Refresh the list after a save
  };

  const handleReturnSuccess = () => {
    setActiveTab("returns");
    setReturnsRefreshCounter(prev => prev + 1); // trigger refresh
  };

  const handlePushToPOS = (order) => {
    toast({
      title: "Pushing to POS...",
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1692914274321-d8d1b0c01d97?auto=format&fit=crop&q=80&w=2000" 
            alt="Sales executive working in wholesale booking" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent dark:from-slate-950/95" />
        </div>
        <div className="relative p-8 md:p-12 z-10 flex flex-col justify-center min-h-[200px]">
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            Book & Return Orders
          </h1>
          <p className="text-slate-200 mt-2 max-w-xl text-lg">
            Manage field bookings, wholesale orders, and process returns in one centralized interface.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(val) => {
        if(val === 'new') setEditingOrder(null);
        setActiveTab(val);
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto mb-8 bg-slate-100/80 dark:bg-slate-800/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="list" className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
            <List className="w-4 h-4" /> <span className="hidden sm:inline">Orders Data</span><span className="sm:hidden">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
            <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">{editingOrder ? 'Edit Order' : 'New Order'}</span><span className="sm:hidden">Add Order</span>
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 transition-all">
            <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Return Orders</span><span className="sm:hidden">Returns</span>
          </TabsTrigger>
          <TabsTrigger value="new-return" className="flex items-center gap-2 rounded-lg py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 transition-all">
            <PackageX className="w-4 h-4" /> <span className="hidden sm:inline">New Return</span><span className="sm:hidden">Add Return</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Booked Orders Tabs */}
        <TabsContent value="list" className="mt-0 outline-none focus-visible:ring-0 animate-in fade-in zoom-in-95 duration-200">
          <BookOrderList 
            orders={orders} 
            isLoading={isLoading} 
            onEdit={handleEdit} 
            onPushToPOS={handlePushToPOS} 
          />
        </TabsContent>
        
        <TabsContent value="new" className="mt-0 outline-none focus-visible:ring-0 animate-in fade-in zoom-in-95 duration-200">
          <BookOrderForm 
            initialData={editingOrder} 
            onSave={handleSaveOrCancel} 
            onCancel={handleSaveOrCancel} 
            key={editingOrder ? editingOrder.id : 'new'} // force re-render when switching
          />
        </TabsContent>

        {/* Return Orders Tabs */}
        <TabsContent value="returns" className="mt-0 outline-none focus-visible:ring-0 animate-in fade-in zoom-in-95 duration-200">
          <ReturnOrderList refreshTrigger={returnsRefreshCounter} />
        </TabsContent>
        
        <TabsContent value="new-return" className="mt-0 outline-none focus-visible:ring-0 animate-in fade-in zoom-in-95 duration-200">
          <ReturnOrderForm 
            onSuccess={handleReturnSuccess} 
            onCancel={() => setActiveTab('returns')} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BookOrdersPage;