import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, cn, useCurrency } from "@/lib/utils";
import { CheckCircle2, Wallet } from 'lucide-react';

/**
 * CashPaymentDialog component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onOpenChange - Function to change the open state
 * @param {number} props.totalAmount - The total amount to be paid
 * @param {function} [props.onComplete] - Required callback when payment is completed successfully
 * @param {boolean} [props.isProcessing] - Indicates if the payment is currently processing
 */
const CashPaymentDialog = ({ 
  open, 
  onOpenChange, 
  totalAmount, 
  onComplete = () => {}, 
  isProcessing = false 
}) => {
  const [cashReceived, setCashReceived] = useState('');
  const [changeToReturn, setChangeToReturn] = useState(0);
  const { symbol } = useCurrency();

  useEffect(() => {
    if (open) {
      setCashReceived('');
      setChangeToReturn(0);
    }
  }, [open]);

  useEffect(() => {
    const received = parseFloat(cashReceived) || 0;
    setChangeToReturn(Math.max(0, received - totalAmount));
  }, [cashReceived, totalAmount]);

  const handleQuickAmount = (amount) => {
    setCashReceived(amount.toString());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const received = parseFloat(cashReceived) || 0;
    if (received < totalAmount) return;
    
    onComplete?.(received, changeToReturn);
  };

  const quickAmounts = [
    totalAmount,
    Math.ceil(totalAmount / 10) * 10,
    Math.ceil(totalAmount / 50) * 50,
    Math.ceil(totalAmount / 100) * 100,
    Math.ceil(totalAmount / 500) * 500,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totalAmount).slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] gap-0 p-0 border-none overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Cash Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
          {/* Total Payable Section */}
          <div className="bg-blue-50/70 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100/50 dark:border-blue-800/50 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Total Payable</span>
            <span className="text-2xl font-black text-gray-900 dark:text-gray-100">
              {formatPrice(totalAmount)}
            </span>
          </div>

          {/* Cash Received Input */}
          <div className="space-y-3">
            <Label htmlFor="cash-input" className="text-gray-600 dark:text-gray-400 font-medium">Cash Received</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">{symbol}</span>
              <Input
                id="cash-input"
                type="number"
                step="0.01"
                placeholder="Enter amount..."
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                autoFocus
                className="pl-10 h-14 text-xl font-bold bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                type="button"
                variant="outline"
                onClick={() => handleQuickAmount(amt)}
                className="bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:bg-blue-100/80 dark:hover:bg-blue-900 h-11 transition-all"
              >
                {symbol}{amt}
              </Button>
            ))}
          </div>

          {/* Change to Return Section */}
          <div className={cn(
            "p-4 rounded-xl border transition-all duration-300 flex justify-between items-center",
            parseFloat(cashReceived) >= totalAmount 
              ? "bg-red-50/70 dark:bg-red-900/20 border-red-400 dark:border-red-700 opacity-100" 
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50"
          )}>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-tighter">Change to Return</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Customer Balance</span>
            </div>
            <span className="text-xl font-black text-red-700 dark:text-red-200">
              {formatPrice(changeToReturn)}
            </span>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 pt-2">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="ghost" 
                className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 h-12 px-6"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isProcessing || !cashReceived || parseFloat(cashReceived) < totalAmount}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 flex-1 sm:flex-none shadow-lg shadow-primary/20"
            >
              {isProcessing ? "Processing..." : "Sale Completed"}
              <CheckCircle2 className="ml-2 w-5 h-5" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CashPaymentDialog;