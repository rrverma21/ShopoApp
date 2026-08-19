import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, Package, IndianRupee, Calendar, Image as ImageIcon, Award } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
    default:
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
  }
};

const ContributionDetailsModal = ({ isOpen, onClose, contribution }) => {
  if (!contribution) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Contribution Details</span>
                {getStatusBadge(contribution.status)}
              </DialogTitle>
              <DialogDescription>
                Submitted on {format(new Date(contribution.created_at), 'PPP')}
              </DialogDescription>
            </DialogHeader>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-6 mt-4"
            >
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Package className="w-3 h-3" /> Product Name
                  </span>
                  <p className="font-medium">{contribution.product_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Package className="w-3 h-3" /> Barcode / EAN
                  </span>
                  <p className="font-medium font-mono text-sm">{contribution.barcode}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" /> MRP
                  </span>
                  <p className="font-medium">₹{contribution.mrp}</p>
                </div>
                {contribution.points_awarded > 0 && (
                   <div className="space-y-1">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Award className="w-3 h-3" /> Points Earned
                    </span>
                    <p className="font-medium text-green-600">+{contribution.points_awarded}</p>
                  </div>
                )}
              </div>

              {/* Image */}
              <div className="space-y-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Submitted Image
                </span>
                {contribution.image_url ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 flex justify-center">
                    <img 
                      src={contribution.image_url} 
                      alt={contribution.product_name} 
                      className="max-h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg p-8 border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">No image provided</span>
                  </div>
                )}
              </div>

              {/* Rejection Reason */}
              {contribution.status === 'rejected' && contribution.rejection_reason && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-100 text-sm">
                  <span className="font-semibold block mb-1">Rejection Reason:</span>
                  {contribution.rejection_reason}
                </div>
              )}

            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default ContributionDetailsModal;