import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, Download, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { amountToWords } from '@/utils/amountToWords';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceView = () => {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const invoiceRef = useRef(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!invoiceId) return;
            try {
                const { data, error } = await supabase
                    .from('pos_gst_invoices')
                    .select('*')
                    .eq('id', invoiceId)
                    .single();
                
                if (error) throw error;
                setInvoice(data);

                if (data.seller_id) {
                    const { data: sellerData } = await supabase
                        .from('pos_retailer_settings')
                        .select('*')
                        .eq('user_id', data.seller_id)
                        .maybeSingle();
                    
                    if (!sellerData || !sellerData.business_name) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', data.seller_id)
                            .single();
                            
                        setSeller({
                            ...sellerData,
                            business_name: profile?.business_name || sellerData?.business_name,
                            business_address: sellerData?.business_address || [profile?.street_address, profile?.city].filter(Boolean).join(', '),
                            business_gstin: profile?.gstin || sellerData?.business_gstin,
                            phone: profile?.phone || sellerData?.phone,
                            tax_type: 'GST'
                        });
                    } else {
                        setSeller(sellerData);
                    }
                }
            } catch (err) {
                console.error("Error loading invoice:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [invoiceId]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        if (!invoiceRef.current) return;
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Invoice_${invoice?.invoice_number || 'GST'}.pdf`);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    if (!invoice) {
        return <div className="p-8 text-center">Invoice not found.</div>;
    }

    const formatPrice = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
    const safeDate = invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd-MM-yyyy') : 'N/A';
    const amountInWordsStr = amountToWords(invoice.total_amount);
    const items = invoice.items_snapshot || [];
    const customer = invoice.customer_details || {};
    const totals = invoice.tax_breakdown || {};
    
    const taxName = invoice.tax_type || seller?.tax_type || 'GST';

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white">
            <div className="max-w-[210mm] mx-auto space-y-4 print:shadow-none print:m-0">
                <div className="flex justify-between items-center print:hidden mb-4">
                    <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 bg-white">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownload} className="gap-2 bg-white">
                            <Download className="h-4 w-4" /> Save PDF
                        </Button>
                        <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                    </div>
                </div>

                <div ref={invoiceRef} className="bg-white w-full p-8 print:p-8 print:shadow-none">
                    
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-black uppercase tracking-wide">
                                {seller?.business_name || 'Business Name'}
                            </h1>
                            <p className="text-sm text-gray-700 mt-1">
                                {seller?.business_address || 'Address Not Provided'}
                            </p>
                            <p className="text-sm text-gray-700">
                                <strong>Tax ID:</strong> {seller?.business_gstin || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-700">
                                <strong>Phone:</strong> {seller?.phone || 'N/A'}
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-black uppercase tracking-wide">TAX INVOICE</h2>
                            <p className="text-sm text-gray-700 mt-1"><strong>Invoice #:</strong> {invoice.invoice_number}</p>
                            <p className="text-sm text-gray-700"><strong>Date:</strong> {safeDate}</p>
                        </div>
                    </div>

                    <div className="border-b-2 border-blue-600 mb-4"></div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="border border-gray-400 p-3 rounded">
                            <h3 className="text-xs font-bold text-black uppercase mb-2 pb-1 border-b border-gray-300">BILL TO (BUYER)</h3>
                            <p className="font-bold text-sm text-gray-900 mt-2">{customer?.name || 'Walk-in Customer'}</p>
                            <p className="text-sm text-gray-700 mt-1">{customer?.address || customer?.billing_address || 'N/A'}</p>
                            <p className="text-sm text-gray-700 mt-1"><strong>Phone:</strong> {customer?.phone || 'N/A'}</p>
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
                                    <span className="text-sm font-semibold text-gray-900">Cash/Online</span>
                                </div>
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
                                    {taxName === 'GST' ? (
                                      <>
                                        <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '70px'}}>CGST</th>
                                        <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '70px'}}>SGST</th>
                                      </>
                                    ) : (
                                        <th className="py-2 px-2 text-xs font-bold text-right border-r border-gray-400" style={{width: '140px'}}>{taxName}</th>
                                    )}
                                    <th className="py-2 px-2 text-xs font-bold text-right" style={{width: '90px'}}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const qty = Number(item.quantity) || 1;
                                    const rate = Number(item.unit_price) || 0;
                                    const taxRate = Number(item.tax_rate) || 0;
                                    const totalPrice = Number(item.total_price) || 0;
                                    const taxableValue = totalPrice;
                                    const taxAmt = (taxableValue * taxRate) / 100;
                                    const cgst = taxAmt / 2;
                                    const sgst = taxAmt / 2;
                                    const itemTotal = taxableValue + taxAmt;

                                    return (
                                        <tr key={idx} className="border-b border-gray-400">
                                            <td className="py-2 px-2 text-xs border-r border-gray-400 text-center">{idx + 1}</td>
                                            <td className="py-2 px-2 text-xs border-r border-gray-400">{item.name || item.product?.name}</td>
                                            <td className="py-2 px-2 text-xs border-r border-gray-400 text-center">{item.hsn_code || '-'}</td>
                                            <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{qty}</td>
                                            <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{rate.toFixed(2)}</td>
                                            <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{taxableValue.toFixed(2)}</td>
                                            {taxName === 'GST' ? (
                                              <>
                                                <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{cgst.toFixed(2)}</td>
                                                <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{sgst.toFixed(2)}</td>
                                              </>
                                            ) : (
                                                <td className="py-2 px-2 text-xs border-r border-gray-400 text-right">{taxAmt.toFixed(2)}</td>
                                            )}
                                            <td className="py-2 px-2 text-xs text-right font-semibold">{itemTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
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
                                    <span className="font-medium">{formatPrice(totals?.total_taxable_value || 0)}</span>
                                </div>
                                {taxName === 'GST' ? (
                                  <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-700">Total CGST</span>
                                        <span className="font-medium">{formatPrice(totals?.total_cgst || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-700">Total SGST</span>
                                        <span className="font-medium">{formatPrice(totals?.total_sgst || 0)}</span>
                                    </div>
                                  </>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-gray-700">Total {taxName}</span>
                                        <span className="font-medium">{formatPrice((totals?.total_cgst || 0) + (totals?.total_sgst || 0) || totals?.total_tax || 0)}</span>
                                    </div>
                                )}
                                <div className="border-t-2 border-gray-400 mt-2 pt-2 flex justify-between items-center">
                                    <span className="font-bold text-base uppercase">GRAND TOTAL</span>
                                    <span className="font-bold text-xl text-black">{formatPrice(invoice.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 text-center">
                        <div className="inline-block text-center">
                            <p className="text-sm font-semibold text-gray-800">For {seller?.business_name || 'Business Name'}</p>
                            <div className="border-b-2 border-gray-600 w-56 mt-16 mb-1 mx-auto"></div>
                            <p className="text-xs text-gray-600 font-medium">Authorized Signatory</p>
                        </div>
                    </div>

                    <div className="mt-6 text-center text-xs text-gray-500 italic">
                        Computer generated invoice - No signature required
                    </div>

                </div>
            </div>
        </div>
    );
};

export default InvoiceView;