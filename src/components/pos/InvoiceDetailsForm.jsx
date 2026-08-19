import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Loader2, Printer, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { amountToWords } from '@/utils/amountToWords';
import { Badge } from '@/components/ui/badge';

const InvoiceDetailsForm = ({ sale, open, onClose }) => {
    const { user } = useAuth();
    const invoiceRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sellerSettings, setSellerSettings] = useState(null);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !open || !sale) return;
            setLoadingData(true);
            try {
                const { data: sellerData, error: sellerError } = await supabase
                    .from('pos_retailer_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                if (sellerError && sellerError.code !== 'PGRST116') throw sellerError;
                setSellerSettings(sellerData || {});

                if (sale.customer_id) {
                    const { data: custData, error: custError } = await supabase
                        .from('point_of_sale_customers')
                        .select('*')
                        .eq('id', sale.customer_id)
                        .single();
                    
                    if (custError && custError.code !== 'PGRST116') throw custError;
                    setCustomerDetails(custData || {});
                } else {
                    setCustomerDetails({
                        name: sale.customer?.name || sale.point_of_sale_customers?.name || 'Walk-in Customer',
                        phone: sale.customer?.phone || sale.customer_phone,
                        address: sale.customer?.address || sale.customer_billing_address || 'N/A'
                    });
                }
            } catch (error) {
                console.error("Error fetching invoice data:", error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [user, open, sale]);

    const handlePrint = () => {
        if (!invoiceRef.current) return;
        window.print();
    };

    const handleDownload = async () => {
        if (!invoiceRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(invoiceRef.current, { 
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${(sale?.invoice_number || sale?.id || '').substring(0, 8)}.pdf`);
        } catch (error) {
            console.error("PDF Generation Error", error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!sale) return null;

    const formatPrice = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
    const safeDate = sale.created_at ? format(new Date(sale.created_at), 'dd-MM-yyyy') : 'N/A';
    const invoiceNo = sale.invoice_number || sale.id?.substring(0, 12).toUpperCase() || 'INV-001';
    const items = sale.items || sale.point_of_sale_sale_items || [];
    
    const subtotal = parseFloat(sale.subtotal || 0);
    const taxAmount = parseFloat(sale.tax_amount || 0);
    const discountAmount = parseFloat(sale.discount_amount || 0);
    const totalAmount = parseFloat(sale.total_amount || 0);
    const amountPaid = parseFloat(sale.amount_paid || 0);

    const amountInWordsStr = amountToWords(totalAmount);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 gap-0 bg-slate-100 dark:bg-slate-900">
                <DialogHeader className="p-4 border-b bg-white dark:bg-slate-950 flex-row justify-between items-center shrink-0 print:hidden">
                    <DialogTitle>Tax Invoice Preview</DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4" /></Button>
                    </DialogClose>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible">
                    {loadingData ? (
                         <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
                    ) : (
                        <div ref={invoiceRef} className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 print:p-8 print:shadow-none">
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-black uppercase tracking-wide">
                                        {sellerSettings?.business_name || 'NINETY LAYERS ENTERPRISES'}
                                    </h1>
                                    <p className="text-sm text-gray-700 mt-1">
                                        {sellerSettings?.business_address || 'Sector-20, Airoli, Navi Mumbai 400708'}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <strong>GSTIN:</strong> {sellerSettings?.business_gstin || '2A7AHDPV4892P1ZA'}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <strong>Phone:</strong> {sellerSettings?.phone || user?.phone || '8691812883'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-bold text-black uppercase tracking-wide">TAX INVOICE</h2>
                                    <p className="text-sm text-gray-700 mt-1"><strong>Invoice No:</strong> {invoiceNo}</p>
                                    <p className="text-sm text-gray-700"><strong>Date:</strong> {safeDate}</p>
                                </div>
                            </div>

                            <div className="border-b-2 border-blue-600 mb-4"></div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="border border-gray-400 p-3 rounded">
                                    <h3 className="text-xs font-bold text-black uppercase mb-2 pb-1 border-b border-gray-300">BILL TO (BUYER)</h3>
                                    <p className="font-bold text-sm text-gray-900 mt-2">{customerDetails?.name || 'Walk-in Customer'}</p>
                                    <p className="text-sm text-gray-700 mt-1">{customerDetails?.address || 'N/A'}</p>
                                    <p className="text-sm text-gray-700 mt-1"><strong>Phone:</strong> {customerDetails?.phone || sale.customer_phone || 'N/A'}</p>
                                </div>

                                <div className="border border-gray-400 p-3 rounded">
                                    <h3 className="text-xs font-bold text-black uppercase mb-2 pb-1 border-b border-gray-300">PAYMENT INFORMATION</h3>
                                    <div className="space-y-1 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-700">Payment Status:</span>
                                            <Badge className="bg-green-600 text-white text-xs px-2 py-0.5">PAID</Badge>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-sm text-gray-700">Payment Method:</span>
                                            <span className="text-sm font-semibold text-gray-900">{sale.payment_method || 'Cash'}</span>
                                        </div>
                                        {amountPaid > 0 && (
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-sm text-gray-700">Amount Paid:</span>
                                                <span className="text-sm font-bold text-gray-900">{formatPrice(amountPaid)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 border border-gray-400 rounded">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 border-b border-gray-400">
                                            <th className="py-2 px-2 text-xs font-bold border-r border-gray-400 text-center" style={{width: '30px'}}>#</th>
                                            <th className="py-2 px-2 text-xs font-bold border-r border-gray-400">Item Description</th>
                                            <th className="py-2 px-2 text-xs font-bold border-r border-gray-400 text-center" style={{width: '80px'}}>HSN/SAC</th>
                                            <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '50px'}}>Qty</th>
                                            <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '70px'}}>Rate</th>
                                            <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '80px'}}>Taxable</th>
                                            <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '70px'}}>CGST</th>
                                            <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '70px'}}>SGST</th>
                                            <th className="py-2 px-2 text-xs font-bold text-right" style={{width: '90px'}}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length > 0 ? items.map((item, index) => {
                                            const rawQty = parseFloat(item.quantity) || 0;
                                            const qty = Number(rawQty).toFixed(3).replace(/\.?0+$/, '');
                                            const unitPrice = Number(item.unit_price) || 0;
                                            const taxRate = item.tax_rate !== null && item.tax_rate !== undefined ? Number(item.tax_rate) : 0;
                                            const totalPrice = Number(item.total_price) || 0;
                                            const taxableValue = totalPrice;
                                            const taxAmt = (taxableValue * taxRate) / 100;
                                            const cgst = taxAmt / 2;
                                            const sgst = taxAmt / 2;
                                            const itemTotal = taxableValue + taxAmt;

                                            return (
                                                <tr key={index} className="border-b border-gray-400">
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-center">{index + 1}</td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400">
                                                        {item.product?.name || item.product_name || item.point_of_sale_products?.name || 'Product'}
                                                    </td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-center">{item.hsn_code || '-'}</td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{qty}</td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{unitPrice.toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{taxableValue.toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{cgst.toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{sgst.toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-xs text-right font-semibold">{itemTotal.toFixed(2)}</td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="9" className="py-8 text-center text-gray-500 text-sm">No items found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mb-4 pl-1">
                                <p className="text-sm text-gray-700 font-semibold">Amount in Words:</p>
                                <p className="text-sm text-black italic mt-1">{amountInWordsStr}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="border border-gray-400 p-3 rounded">
                                    <h3 className="text-xs font-bold text-black uppercase mb-2 pb-1 border-b border-gray-300">TERMS & CONDITIONS:</h3>
                                    <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1 mt-2">
                                        <li>Goods once sold will not be taken back or exchanged.</li>
                                        <li>Our responsibility ends after delivery of goods.</li>
                                        <li>Disputes if any shall be subject to local jurisdiction only.</li>
                                        <li>E. & O.E.</li>
                                    </ul>
                                </div>

                                <div className="border border-gray-400 p-3 rounded">
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Total Taxable Amount</span>
                                            <span className="font-medium">{formatPrice(subtotal)}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Discount</span>
                                                <span className="font-medium text-green-600">-{formatPrice(discountAmount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Total CGST</span>
                                            <span className="font-medium">{formatPrice(taxAmount / 2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Total SGST</span>
                                            <span className="font-medium">{formatPrice(taxAmount / 2)}</span>
                                        </div>
                                        <div className="border-t-2 border-gray-400 mt-2 pt-2 flex justify-between items-center">
                                            <span className="font-bold text-base uppercase">GRAND TOTAL</span>
                                            <span className="font-bold text-xl text-black">{formatPrice(totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-20 text-center">
                                <div className="inline-block text-center">
                                    <p className="text-sm font-semibold text-gray-800">For {sellerSettings?.business_name || 'NINETY LAYERS ENTERPRISES'}</p>
                                    <div className="border-b-2 border-gray-600 w-56 mt-16 mb-1 mx-auto"></div>
                                    <p className="text-xs text-gray-600 font-medium">Authorized Signatory</p>
                                </div>
                            </div>

                            <div className="mt-6 text-center text-xs text-gray-500 italic">
                                Computer generated invoice - No signature required
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white dark:bg-slate-950 flex justify-end gap-4 shrink-0 print:hidden">
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>Close</Button>
                    <Button variant="secondary" onClick={handleDownload} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download PDF
                    </Button>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700" disabled={isGenerating}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Invoice
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default InvoiceDetailsForm;