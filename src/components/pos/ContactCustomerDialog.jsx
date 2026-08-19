import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ContactCustomerDialog = ({ isOpen, onClose, customerName, customerPhone, orderId }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(`Hi ${customerName}, this is regarding your water order #${orderId?.slice(0,6)}. We are processing your delivery.`);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(customerPhone);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Phone number copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${customerPhone}?text=${encodedMessage}`, '_blank');
  };

  const handleSMS = () => {
    window.open(`sms:${customerPhone}?body=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCall = () => {
    window.open(`tel:${customerPhone}`, '_self');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Customer</DialogTitle>
          <DialogDescription>
            Choose a method to contact {customerName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="flex gap-2">
              <Input value={customerPhone} readOnly className="bg-slate-50" />
              <Button size="icon" variant="outline" onClick={handleCopyPhone}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message Template</Label>
            <Textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="flex flex-col gap-1 h-20 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={handleWhatsApp}>
              <MessageCircle className="h-6 w-6" />
              <span>WhatsApp</span>
            </Button>
            <Button variant="outline" className="flex flex-col gap-1 h-20 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={handleSMS}>
              <MessageCircle className="h-6 w-6" />
              <span>SMS</span>
            </Button>
             <Button variant="outline" className="flex flex-col gap-1 h-20 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200" onClick={handleCall}>
              <Phone className="h-6 w-6" />
              <span>Call</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactCustomerDialog;