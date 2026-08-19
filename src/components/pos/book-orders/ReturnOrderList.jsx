import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PackageX, AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Box, Settings2, FileText } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import ReturnOrderProcessModal from './ReturnOrderProcessModal';
import SalesReturnCreditNote from './SalesReturnCreditNote';

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1556742504-16b083241fab",
  "https://images.unsplash.com/photo-1618063229822-53ae138e7f12"
];

const ReturnOrderList = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});
  
  // Modals state
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);

  const fetchReturns = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('return_orders')
        .select(`
          id, 
          status, 
          created_at, 
          booked_order_id,
          approval_status,
          approval_comments,
          credit_note_id,
          credit_note_number,
          refund_amount,
          return_order_items (
            id,
            product_id,
            product_name,
            quantity,
            reason,
            comments
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast({
        title: "Error fetching returns",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns, refreshTrigger]);

  const toggleExpand = (id) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCancelReturn = async (id) => {
    try {
      const { error } = await supabase
        .from('return_orders')
        .update({ status: 'Cancelled' })
        .eq('id', id)
        .eq('status', 'Pending'); // Extra safety

      if (error) throw error;
      
      toast({
        title: "Return Cancelled",
        description: "The return request has been cancelled.",
        className: "bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
      });
      
      fetchReturns();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleProcessClick = (ret, e) => {
    e.stopPropagation();
    setSelectedReturn(ret);
    setIsProcessModalOpen(true);
  };

  const handleViewCreditNoteClick = async (cnId, e) => {
    e.stopPropagation();
    try {
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('id', cnId)
        .single();
        
      if (error) throw error;
      
      setSelectedCreditNote(data);
      setIsCreditNoteModalOpen(true);
    } catch (error) {
      toast({
        title: "Error loading Credit Note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending':
        return { 
          color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
          icon: <Clock className="w-3.5 h-3.5 mr-1.5" />
        };
      case 'Approved':
      case 'Partial':
        return { 
          color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
        };
      case 'Rejected':
      case 'Cancelled':
        return { 
          color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
          icon: <XCircle className="w-3.5 h-3.5 mr-1.5" />
        };
      case 'Processed':
      case 'Completed':
        return { 
          color: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
        };
      default:
        return { 
          color: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!returns || returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl max-w-4xl mx-auto">
        <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-full mb-5">
          <PackageX className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Return Orders Found</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
          You haven't initiated any returns yet. Click "New Return" to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {returns.map((ret) => {
        const statusConfig = getStatusConfig(ret.status);
        const isExpanded = expandedOrders[ret.id];
        const items = ret.return_order_items || [];
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        return (
          <div 
            key={ret.id} 
            className="group flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
          >
            {/* Header / Summary */}
            <div 
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer bg-slate-50/50 dark:bg-slate-900/20"
              onClick={() => toggleExpand(ret.id)}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <Box className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                    Return #{ret.id.split('-')[0].toUpperCase()}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <span>{format(new Date(ret.created_at), 'dd MMM yyyy, h:mm a')}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <span className="font-medium">{items.length} Product{items.length !== 1 ? 's' : ''} ({totalQuantity} items)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <Badge variant="outline" className={`px-3 py-1 text-xs font-semibold ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {ret.status}
                </Badge>
                
                {/* Contextual Action Button */}
                {ret.status === 'Pending' ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                    onClick={(e) => handleProcessClick(ret, e)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Process Return
                  </Button>
                ) : ret.credit_note_id ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                    onClick={(e) => handleViewCreditNoteClick(ret.credit_note_id, e)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Credit Note
                  </Button>
                ) : null}

                <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Expanded Content: Items List */}
            {isExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-950">
                <div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Returned Items
                  </h5>
                  {ret.approval_comments && (
                     <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md">
                        <span className="font-semibold mr-1">Notes:</span>{ret.approval_comments}
                     </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                      <div className="h-16 w-16 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0">
                         <img 
                          src={DEFAULT_IMAGES[index % DEFAULT_IMAGES.length]} 
                          alt={item.product_name} 
                          className="h-full w-full object-cover opacity-80"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h6 className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-4">
                            {item.product_name}
                          </h6>
                          <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            Qty: {item.quantity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Reason: </span>
                            <span className="text-sm text-slate-800 dark:text-slate-200 ml-1">{item.reason}</span>
                          </div>
                          {item.comments && (
                            <div className="md:col-span-2">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Notes: </span>
                              <span className="text-sm text-slate-600 dark:text-slate-400 italic ml-1 break-words">{item.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions Footer */}
                {ret.status === 'Pending' && (
                  <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                      variant="outline" 
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-900/20"
                      onClick={() => handleCancelReturn(ret.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Entire Return
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <ReturnOrderProcessModal 
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        returnOrder={selectedReturn}
        onSuccess={fetchReturns}
      />

      <Dialog open={isCreditNoteModalOpen} onOpenChange={setIsCreditNoteModalOpen}>
        <DialogContent className="max-w-4xl bg-slate-100 dark:bg-slate-900 p-0 border-none overflow-hidden max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">
          <SalesReturnCreditNote creditNote={selectedCreditNote} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnOrderList;