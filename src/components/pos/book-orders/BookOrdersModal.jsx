import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, ClipboardList, Search, RefreshCw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import BookOrderList from './BookOrderList';
import BookOrderDetailsModal from './BookOrderDetailsModal';

const BookOrdersModal = ({ isOpen, onClose, onPushToCart }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booked_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching booked orders:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch booked orders.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  const filteredOrders = orders.filter(order => {
    const matchesTab = order.order_status === activeTab;
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = 
      order.retailer_name?.toLowerCase().includes(searchStr) || 
      order.executive_name?.toLowerCase().includes(searchStr) ||
      order.id.toLowerCase().includes(searchStr);
    
    return matchesTab && matchesSearch;
  });

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handlePushToPOS = (order) => {
    onPushToCart(order);
    setIsDetailsOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">Booked Orders</DialogTitle>
                  <DialogDescription>
                    Process orders submitted by Sales Executives into your POS
                  </DialogDescription>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by customer or executive..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
            <div className="px-6 border-b border-slate-200 dark:border-slate-800">
              <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 p-1">
                <TabsTrigger value="Pending" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  Pending ({orders.filter(o => o.order_status === 'Pending').length})
                </TabsTrigger>
                <TabsTrigger value="Confirmed" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  Confirmed
                </TabsTrigger>
                <TabsTrigger value="Cancelled" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                  Cancelled
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" />
                  <p>Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No orders found</h3>
                  <p className="text-slate-500">There are no {activeTab.toLowerCase()} orders matching your search.</p>
                </div>
              ) : (
                <BookOrderList 
                  orders={filteredOrders} 
                  onViewDetails={handleViewDetails} 
                  onPushToPOS={handlePushToPOS} 
                />
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {selectedOrder && (
        <BookOrderDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          order={selectedOrder}
          onPushToPOS={handlePushToPOS}
        />
      )}
    </>
  );
};

export default BookOrdersModal;

import { cn } from '@/lib/utils';