import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const UpgradeRequestModal = ({ isOpen, onClose, currentPlan, currentProducts, maxProducts }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [requestedPlan, setRequestedPlan] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedPlan) {
      toast({ title: "Validation Error", description: "Please select a desired plan.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('upgrade_requests').insert([{
        seller_id: user.id,
        seller_name: user?.profile?.business_name || user?.profile?.contact_person || 'Unknown Seller',
        seller_email: user?.email,
        current_plan: currentPlan || 'Free Starter',
        requested_plan: requestedPlan,
        message: message,
        status: 'pending'
      }]);

      if (error) throw error;

      toast({ title: "Request Submitted", description: "Your upgrade request was submitted successfully. Our team will contact you soon." });
      
      setTimeout(() => {
        onClose();
        setRequestedPlan('');
        setMessage('');
      }, 2000);

    } catch (err) {
      console.error(err);
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Plan Upgrade</DialogTitle>
          <DialogDescription>
            Submit a request to upgrade your account. Our sales team will review and approve your request.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Seller Name</Label>
            <Input readOnly disabled value={user?.profile?.business_name || user?.profile?.contact_person || ''} className="bg-slate-100 dark:bg-slate-800 text-slate-500" />
          </div>
          
          <div className="space-y-2">
            <Label>Seller Email</Label>
            <Input readOnly disabled value={user?.email || ''} className="bg-slate-100 dark:bg-slate-800 text-slate-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <Input readOnly disabled value={currentPlan || 'Free'} className="bg-slate-100 dark:bg-slate-800 text-slate-500" />
            </div>
            <div className="space-y-2">
              <Label>Products Used</Label>
              <Input readOnly disabled value={`${currentProducts} / ${maxProducts}`} className="bg-slate-100 dark:bg-slate-800 text-slate-500" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requestedPlan">Desired Plan *</Label>
            <Select value={requestedPlan} onValueChange={setRequestedPlan} required>
              <SelectTrigger id="requestedPlan">
                <SelectValue placeholder="Select a plan to upgrade to" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message / Notes (Optional)</Label>
            <Textarea 
              id="message" 
              placeholder="Let us know if you need specific features or custom limits..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none h-24"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeRequestModal;