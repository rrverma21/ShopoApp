import React, { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { format } from 'date-fns';
import { roundAmount } from '@/utils/roundAmount';
import { supabase } from '@/lib/supabaseClient';

const InvoicePreview = ({ businessDetails, saleData, saleItems }) => {
    const [creditUsages, setCreditUsages] = useState([]);
    const [loading, setLoading] = useState(true);

    const subtotal = roundAmount(saleData.subtotal);
    const taxAmount = roundAmount(saleData.tax_amount);
    const totalAmount = roundAmount(saleData.total_amount);

    useEffect(() => {
        const fetchCreditUsages = async () => {
            if (!saleData?.id && !saleData?.bill_number) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                const billIds = [];
                if (saleData.id) billIds.push(saleData.id.toString());
                if (saleData.bill_number) billIds.push(saleData.bill_number.toString());

                const { data, error } = await supabase
                    .from('pos_credit_note_usage')
                    .select(`
                        id, 
                        amount_used, 
                        pos_credit_notes ( credit_note_number )
                    `)
                    .in('bill_id', billIds)
                    .neq('status', 'Cancelled');
                
                if (data && !error) {
                    setCreditUsages(data);
                }
            } catch (err) {
                console.error("Error fetching credit usages:", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchCreditUsages();
    }, [saleData]);

    const totalCreditApplied = roundAmount(creditUsages.reduce((sum, usage) => sum + Number(usage.amount_used || 0), 0));
    const finalAmountDue = Math.max(0, roundAmount(totalAmount - totalCreditApplied));
    
    return (
        <div className="bg-white p-8 max-w-2xl mx-auto shadow-sm text-slate-800 text-sm font-mono border border-slate-200">
            <div className="text-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold uppercase">{businessDetails?.business_name || 'My Store'}</h2>
                <p>{businessDetails?.street_address}</p>
                <p>{businessDetails?.city} - {businessDetails?.pincode}</p>
                <p>Ph: {businessDetails?.phone}</p>
                {businessDetails?.gstin && <p>GSTIN: {businessDetails?.gstin}</p>}
            </div>
            
            <div className="flex justify-between mb-4">
                <div>
                    <p>Bill No: <span className="font-bold">{saleData.bill_number || saleData.invoice_number || 'N/A'}</span></p>
                    <p>Date: {saleData.created_at ? format(new Date(saleData.created_at), 'dd MMM yyyy, hh:mm a') : format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
                <div className="text-right">
                    <p>Payment: <span className="font-bold">{saleData.payment_method}</span></p>
                    <p>Status: <span className="font-bold">{saleData.payment_status}</span></p>
                </div>
            </div>
            
            <table className="w-full mb-4 border-t border-b py-2">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {saleItems.map((item, idx) => {
                        const itemPrice = roundAmount(item.unit_price);
                        const itemTotal = roundAmount(itemPrice * item.quantity);
                        return (
                            <tr key={idx} className="border-b border-dashed border-slate-200">
                                <td className="py-2">
                                    {item.name}
                                    {item.variant_name && <span className="text-xs text-slate-500 block">({item.variant_name})</span>}
                                </td>
                                <td className="text-center py-2">{item.quantity}</td>
                                <td className="text-right py-2">{formatPrice(itemPrice)}</td>
                                <td className="text-right py-2 font-medium">{formatPrice(itemTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            <div className="flex flex-col items-end space-y-1 mt-4">
                <div className="flex justify-between w-48">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                    <div className="flex justify-between w-48">
                        <span>Tax:</span>
                        <span>{formatPrice(taxAmount)}</span>
                    </div>
                )}
                {saleData.discount_amount > 0 && (
                    <div className="flex justify-between w-48 text-emerald-600">
                        <span>Discount:</span>
                        <span>-{formatPrice(roundAmount(saleData.discount_amount))}</span>
                    </div>
                )}
                
                {!loading && totalCreditApplied > 0 ? (
                    <>
                        <div className="flex justify-between w-48 font-medium border-t border-slate-200 pt-2 mt-2">
                            <span>Grand Total:</span>
                            <span>{formatPrice(totalAmount)}</span>
                        </div>
                        
                        <div className="invoice-credit-section w-full flex flex-col items-end">
                            <div className="w-48 text-left font-semibold text-[10px] mb-1.5 text-slate-500 uppercase tracking-wider">
                                Credit Notes Applied
                            </div>
                            {creditUsages.map(usage => (
                                <div key={usage.id} className="flex justify-between w-48 text-amber-700 text-sm py-0.5">
                                    <span>{usage.pos_credit_notes?.credit_note_number || 'CN'}</span>
                                    <span>-{formatPrice(usage.amount_used)}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="invoice-final-due">
                            <span>Final Due:</span>
                            <span>{formatPrice(finalAmountDue)}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex justify-between w-48 font-bold border-t pt-2 mt-2">
                        <span>Grand Total:</span>
                        <span>{formatPrice(totalAmount)}</span>
                    </div>
                )}
            </div>
            
            <div className="text-center mt-8 pt-4 border-t text-xs text-slate-500">
                <p>Thank you for shopping with us!</p>
                <p>Please visit again.</p>
            </div>
        </div>
    );
};

export default InvoicePreview;