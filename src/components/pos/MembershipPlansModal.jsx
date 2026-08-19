import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PlanCard from './PlanCard';

const MembershipPlansModal = ({ isOpen, onClose, currentPlanId }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to load membership plans.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    // In a real app, this would trigger a payment flow or plan change logic
    toast({
      title: "Upgrade Requested",
      description: `You've selected the ${plan.name} plan. Our team will contact you shortly to process the upgrade.`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent click propagation to backdrop
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Upgrade Membership</h2>
                    <p className="text-xs text-slate-500">Choose a plan that fits your business needs</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 flex-grow">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                  <p className="text-slate-500 font-medium">Loading available plans...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
                  {plans.map((plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      isCurrent={currentPlanId === plan.id}
                      onSelect={handleSelectPlan}
                    />
                  ))}
                  {plans.length === 0 && (
                     <div className="col-span-full text-center py-12 text-slate-500">
                        No plans available at the moment.
                     </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 shrink-0 flex justify-end gap-3">
               <Button variant="outline" onClick={onClose} className="min-w-[100px]">
                 Cancel
               </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MembershipPlansModal;