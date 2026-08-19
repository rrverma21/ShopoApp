import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

const UpgradeRequestDetailsModal = ({ isOpen, onClose, request, onUpdated }) => {
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [availablePlans, setAvailablePlans] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (request) {
      setAdminNotes(request.admin_notes || '');
    }
  }, [request]);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('membership_plans').select('id, name').eq('is_active', true);
    if (data) setAvailablePlans(data);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'approved' && !selectedPlanId) {
      toast({ title: "Select Plan", description: "You must select an actual membership plan to assign upon approval.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Update Profile if Approved
      if (newStatus === 'approved') {
        const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);
        if (!selectedPlan) throw new Error("Plan not found");

        const { error: profileError } = await supabase.from('profiles').update({
          membership_plan_id: selectedPlan.id,
          plan_activated_at: new Date().toISOString(),
        }).eq('id', request.seller_id);
        
        if (profileError) throw profileError;
      }

      // 2. Update Request Record
      const { error: reqError } = await supabase.from('upgrade_requests').update({
        status: newStatus,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      }).eq('id', request.id);

      if (reqError) throw reqError;

      // 3. Send Email Notification via Edge Function
      try {
        await supabase.functions.invoke('send-upgrade-email', {
          body: {
            seller_email: request.seller_email,
            seller_name: request.seller_name,
            status: newStatus,
            requested_plan: request.requested_plan,
            admin_notes: adminNotes
          }
        });
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
        toast({ title: "Email Failed", description: "Status updated, but email notification failed to send.", variant: "destructive" });
      }

      toast({ title: "Success", description: `Request marked as ${newStatus}.` });
      onUpdated();
      onClose();

    } catch (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!request) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Upgrade Request Details
            <Badge className={getStatusColor(request.status)} variant="outline">
              {request.status.toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review and process the seller's upgrade request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Seller Details */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Seller Name:</span>
              <span className="font-medium">{request.seller_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium">{request.seller_email}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-slate-500">Current Plan:</span>
              <span className="font-medium text-slate-700">{request.current_plan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Requested Plan:</span>
              <span className="font-bold text-indigo-600">{request.requested_plan}</span>
            </div>
          </div>

          {/* Seller Message */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500 uppercase tracking-wider">Seller's Message</Label>
            <div className="p-3 bg-white dark:bg-slate-900 border rounded-md text-sm text-slate-700 min-h-[60px]">
              {request.message || <span className="italic text-slate-400">No message provided.</span>}
            </div>
          </div>

          {/* Approval Configuration */}
          {request.status === 'pending' && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="planAssign">Assign Plan on Approval</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="planAssign">
                  <SelectValue placeholder="Select plan to assign..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes (Included in email)</Label>
            <Textarea 
              id="adminNotes" 
              value={adminNotes} 
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes, reasons for rejection, or next steps..."
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4 mt-2">
          {request.status !== 'pending' ? (
            <Button variant="outline" className="w-full" onClick={() => handleStatusUpdate('pending')} disabled={isProcessing}>
              <Clock className="w-4 h-4 mr-2" /> Revert to Pending
            </Button>
          ) : (
            <>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />} Reject
              </Button>
              <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusUpdate('approved')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />} Approve Upgrade
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeRequestDetailsModal;