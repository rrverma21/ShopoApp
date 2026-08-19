import React, { useState, useMemo } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

const SplitPaymentDialog = ({ totalAmount, onComplete }) => {
    const paymentOptions = ['Cash', 'Card', 'UPI', 'Other'];
    const [payments, setPayments] = useState([{ method: 'Cash', amount: '' }]);
    const [isProcessing, setIsProcessing] = useState(false);

    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [payments]);
    const remaining = useMemo(() => totalAmount - totalPaid, [totalAmount, totalPaid]);

    const handleAddPayment = () => {
        setPayments([...payments, { method: 'Cash', amount: '' }]);
    };

    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        setPayments(newPayments);
    };

    const handleRemovePayment = (index) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
    };

    const handleComplete = () => {
        if (Math.abs(remaining) > 0.01) {
            alert("The paid amount does not match the total amount.");
            return;
        }
        setIsProcessing(true);
        const formattedPayments = payments
            .filter(p => parseFloat(p.amount) > 0)
            .map(p => ({ method: p.method, amount: parseFloat(p.amount) }));
        onComplete(formattedPayments);
        // Reset local state to clear form for next use
        setPayments([{ method: 'Cash', amount: '' }]);
        setIsProcessing(false);
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Split Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold">{formatPrice(totalAmount)}</p>
                </div>
                {payments.map((payment, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <select
                            value={payment.method}
                            onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {paymentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={payment.amount}
                            onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePayment(index)} disabled={payments.length === 1}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddPayment}>Add Payment Method</Button>
                <div className="space-y-2 pt-4">
                    <div className="flex justify-between font-medium">
                        <span>Total Paid:</span>
                        <span>{formatPrice(totalPaid)}</span>
                    </div>
                    <div className={`flex justify-between font-bold ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        <span>Remaining:</span>
                        <span>{formatPrice(remaining)}</span>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button 
                    onClick={handleComplete} 
                    disabled={Math.abs(remaining) > 0.01 || isProcessing}
                    className={cn(
                        "bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white shadow-sm transition-all duration-200 active:scale-95",
                        "disabled:opacity-50 disabled:pointer-events-none"
                    )}
                >
                    {isProcessing ? 'Processing...' : 'Confirm Payments'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

export default SplitPaymentDialog;