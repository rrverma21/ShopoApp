import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PaidBillDetailsModal = ({ billId, isOpen, onClose }) => {
    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && billId) {
            fetchBillDetails();
        } else {
            setBill(null);
        }
    }, [isOpen, billId]);

    const fetchBillDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('purchase_bills')
                .select(`
                    *,
                    suppliers (name, gst_number, address)
                `)
                .eq('id', billId)
                .single();

            if (error) throw error;
            setBill(data);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            toast({
                title: 'Error',
                description: 'Failed to load bill details.',
                variant: 'destructive'
            });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
        toast({
            title: 'Printing',
            description: 'Preparing document for printing...'
        });
    };

    if (!isOpen) return null;

    const totalGst = (bill?.sgst_total || 0) + (bill?.cgst_total || 0);
    const items = bill?.items || [];

    // Calculate GST Breakdown
    const gstBreakdown = items.reduce((acc, item) => {
        const rate = item.gst_percentage || 0;
        const amount = (item.rate * item.quantity) - (item.discount || 0);
        const taxAmount = (amount * rate) / 100;
        
        if (rate > 0) {
            if (!acc[rate]) acc[rate] = { taxable: 0, tax: 0 };
            acc[rate].taxable += amount;
            acc[rate].tax += taxAmount;
        }
        return acc;
    }, {});

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div>
                        <DialogTitle className="text-xl font-bold">Purchase Bill Details</DialogTitle>
                        <DialogDescription>
                            {bill?.bill_no ? `Bill #${bill.bill_no}` : 'Loading...'}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Loading bill information...</p>
                    </div>
                ) : bill ? (
                    <div className="space-y-6 print:p-4" id="printable-bill">
                        {/* Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg text-primary">Supplier Details</h3>
                                <p className="font-medium">{bill.suppliers?.name || 'Unknown Supplier'}</p>
                                {bill.suppliers?.gst_number && (
                                    <p className="text-sm text-muted-foreground">GSTIN: {bill.suppliers.gst_number}</p>
                                )}
                                {bill.suppliers?.address && (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bill.suppliers.address}</p>
                                )}
                            </div>
                            <div className="space-y-1 md:text-right">
                                <h3 className="font-semibold text-lg text-primary">Bill Summary</h3>
                                <p className="font-medium">Bill No: {bill.bill_no}</p>
                                <p className="text-sm text-muted-foreground">
                                    Date: {bill.bill_date ? format(new Date(bill.bill_date), 'dd MMM yyyy') : 'N/A'}
                                </p>
                                <Badge className={bill.payment_status === 'Paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                                    {bill.payment_status}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Items Table */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Itemized Details</h3>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Rate (₹)</TableHead>
                                            <TableHead className="text-right">GST %</TableHead>
                                            <TableHead className="text-right">GST (₹)</TableHead>
                                            <TableHead className="text-right">Total (₹)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length > 0 ? (
                                            items.map((item, idx) => {
                                                const taxable = (item.rate * item.quantity) - (item.discount || 0);
                                                const tax = (taxable * (item.gst_percentage || 0)) / 100;
                                                const total = taxable + tax;
                                                
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">
                                                            {item.product_name}
                                                            {item.variant_name && <span className="text-xs text-muted-foreground block">{item.variant_name}</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                                        <TableCell className="text-right">{Number(item.rate).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">{item.gst_percentage || 0}%</TableCell>
                                                        <TableCell className="text-right">{tax.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-medium">{total.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                                    No items found in this bill.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* GST Breakdown & Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-3">GST Breakdown</h3>
                                {Object.keys(gstBreakdown).length > 0 ? (
                                    <div className="rounded-md border p-4 bg-muted/20 space-y-2">
                                        {Object.entries(gstBreakdown).map(([rate, data]) => (
                                            <div key={rate} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">GST @ {rate}% (Taxable: ₹{data.taxable.toFixed(2)})</span>
                                                <span className="font-medium">₹{data.tax.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <Separator className="my-2" />
                                        <div className="flex justify-between font-semibold text-sm">
                                            <span>Total GST</span>
                                            <span>₹{totalGst.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No GST applicable items.</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-md border p-4 bg-primary/5 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>₹{(bill.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total GST</span>
                                        <span>₹{totalGst.toFixed(2)}</span>
                                    </div>
                                    {bill.round_off_amount ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Round Off</span>
                                            <span>₹{Number(bill.round_off_amount).toFixed(2)}</span>
                                        </div>
                                    ) : null}
                                    <Separator className="my-2" />
                                    <div className="flex justify-between font-bold text-lg text-primary">
                                        <span>Grand Total</span>
                                        <span>₹{(bill.total_amount || 0).toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="pt-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Amount Paid</span>
                                            <span className="text-green-600 font-medium">₹{(bill.amount_paid || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Payment Mode</span>
                                            <span>{bill.payment_mode || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        Bill not found.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PaidBillDetailsModal;