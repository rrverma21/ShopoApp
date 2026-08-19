import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Truck, Eye, Phone, Ban, CheckCircle } from "lucide-react";
import ContactCustomerDialog from './ContactCustomerDialog';

const WaterOrderActions = ({ order, onMarkDelivered, onCancelOrder, onViewDetails, isMobile = false }) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleCancelConfirm = () => {
    onCancelOrder(order.id, cancelReason);
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const handleDeliverConfirm = () => {
    onMarkDelivered(order.id);
    setShowDeliverDialog(false);
  };

  const canCancel = ['pending', 'accepted'].includes(order.status.toLowerCase());
  const canDeliver = ['pending', 'accepted', 'confirmed'].includes(order.status.toLowerCase());

  if (isMobile) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(order)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowContactDialog(true)}>
              <Phone className="mr-2 h-4 w-4" /> Contact Customer
            </DropdownMenuItem>
            {canDeliver && (
              <DropdownMenuItem onClick={() => setShowDeliverDialog(true)} className="text-green-600">
                <Truck className="mr-2 h-4 w-4" /> Mark as Delivered
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem onClick={() => setShowCancelDialog(true)} className="text-red-600">
                <Ban className="mr-2 h-4 w-4" /> Cancel Order
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dialogs Reuse */}
        <Dialogs 
           showCancelDialog={showCancelDialog} setShowCancelDialog={setShowCancelDialog}
           showDeliverDialog={showDeliverDialog} setShowDeliverDialog={setShowDeliverDialog}
           showContactDialog={showContactDialog} setShowContactDialog={setShowContactDialog}
           cancelReason={cancelReason} setCancelReason={setCancelReason}
           handleCancelConfirm={handleCancelConfirm}
           handleDeliverConfirm={handleDeliverConfirm}
           order={order}
        />
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-end">
       <Button 
        variant="outline" 
        size="sm" 
        className="text-blue-600 border-blue-200 hover:bg-blue-50"
        onClick={() => onViewDetails(order)}
      >
        <Eye className="h-4 w-4 mr-1" /> Details
      </Button>

      <Button 
        variant="outline" 
        size="sm" 
        className="text-gray-600 border-gray-200 hover:bg-gray-50"
        onClick={() => setShowContactDialog(true)}
      >
        <Phone className="h-4 w-4 mr-1" /> Contact
      </Button>

      {canDeliver && (
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700 hover:border-green-300"
          onClick={() => setShowDeliverDialog(true)}
        >
          <CheckCircle className="h-4 w-4 mr-1" /> Delivered
        </Button>
      )}

      {canCancel && (
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300"
          onClick={() => setShowCancelDialog(true)}
        >
          <Ban className="h-4 w-4 mr-1" /> Cancel
        </Button>
      )}

      {/* Dialogs Reuse */}
      <Dialogs 
           showCancelDialog={showCancelDialog} setShowCancelDialog={setShowCancelDialog}
           showDeliverDialog={showDeliverDialog} setShowDeliverDialog={setShowDeliverDialog}
           showContactDialog={showContactDialog} setShowContactDialog={setShowContactDialog}
           cancelReason={cancelReason} setCancelReason={setCancelReason}
           handleCancelConfirm={handleCancelConfirm}
           handleDeliverConfirm={handleDeliverConfirm}
           order={order}
      />
    </div>
  );
};

// Extracted Dialogs component to avoid duplication
const Dialogs = ({
    showCancelDialog, setShowCancelDialog,
    showDeliverDialog, setShowDeliverDialog,
    showContactDialog, setShowContactDialog,
    cancelReason, setCancelReason,
    handleCancelConfirm, handleDeliverConfirm,
    order
}) => (
    <>
        <ContactCustomerDialog 
            isOpen={showContactDialog}
            onClose={() => setShowContactDialog(false)}
            customerName={order.customer_name}
            customerPhone={order.customer_phone}
            orderId={order.id}
        />

        <AlertDialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Mark as Delivered?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will update the order status to Delivered. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeliverConfirm} className="bg-green-600 hover:bg-green-700">
                        Confirm Delivery
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancel Order</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for cancelling this order.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="reason" className="mb-2 block">Cancellation Reason</Label>
                    <Input 
                        id="reason"
                        value={cancelReason} 
                        onChange={(e) => setCancelReason(e.target.value)} 
                        placeholder="e.g., Out of stock, Customer request..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Keep Order</Button>
                    <Button variant="destructive" onClick={handleCancelConfirm}>Cancel Order</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
);

export default WaterOrderActions;