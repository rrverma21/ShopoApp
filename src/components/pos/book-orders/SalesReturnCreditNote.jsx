import React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

export default function SalesReturnCreditNote({ creditNote }) {
  if (!creditNote) return null;

  const items = creditNote.items_json || [];

  const handlePrint = () => {
    window.print();
  };

  // Define print-specific CSS as a string to be injected via dangerouslySetInnerHTML
  // This is the standard way to handle media queries and global overrides within a component's scope
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      .print\\:hidden {
        display: none !important;
      }
      .relative > div:last-child,
      .relative > div:last-child * {
        visibility: visible;
      }
      .relative > div:last-child {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      @page { size: auto;  margin: 10mm; }
    }
  `;

  return (
    <div className="relative">
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
          <Printer className="w-4 h-4 mr-2" />
          Print Credit Note
        </Button>
      </div>
      
      {/* Printable Area */}
      <div className="bg-white text-black p-8 rounded-xl w-full mx-auto shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full">
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-slate-800">Credit Note</h1>
            <p className="text-slate-500 font-medium mt-1">Sales Return</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">Credit Note #: <span className="font-normal">{creditNote.credit_note_number}</span></p>
            <p className="text-sm font-semibold text-slate-800">Date: <span className="font-normal">{format(new Date(creditNote.created_at), 'dd MMM yyyy')}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 border-b border-slate-100 pb-1">Issued By</h3>
            <p className="font-bold text-slate-800">{creditNote.company_name || 'Retailer Name'}</p>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{creditNote.company_address || 'Address Not Provided'}</p>
            {creditNote.company_gst && <p className="text-sm text-slate-600 mt-1"><span className="font-semibold">GSTIN:</span> {creditNote.company_gst}</p>}
          </div>
          
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 border-b border-slate-100 pb-1">Bill To</h3>
            <p className="font-bold text-slate-800">{creditNote.bill_to_name || 'Customer Name'}</p>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{creditNote.bill_to_address || 'Address Not Provided'}</p>
            {creditNote.bill_to_gst && <p className="text-sm text-slate-600 mt-1"><span className="font-semibold">GSTIN:</span> {creditNote.bill_to_gst}</p>}
          </div>
        </div>

        <div className="mb-8">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-y border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-800 font-bold h-10 w-12">#</TableHead>
                <TableHead className="text-slate-800 font-bold h-10">Item Description</TableHead>
                <TableHead className="text-slate-800 font-bold h-10">HSN</TableHead>
                <TableHead className="text-slate-800 font-bold h-10 text-right">Rate</TableHead>
                <TableHead className="text-slate-800 font-bold h-10 text-right">Qty</TableHead>
                <TableHead className="text-slate-800 font-bold h-10 text-right">Tax %</TableHead>
                <TableHead className="text-slate-800 font-bold h-10 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx} className="border-b border-slate-100 hover:bg-white">
                  <TableCell className="py-3 text-slate-600">{idx + 1}</TableCell>
                  <TableCell className="py-3">
                    <div className="font-medium text-slate-800">{item.product_name}</div>
                    <div className="text-xs text-slate-500">Reason: {item.reason}</div>
                  </TableCell>
                  <TableCell className="py-3 text-slate-600">{item.hsn || '-'}</TableCell>
                  <TableCell className="py-3 text-right text-slate-600">{formatCurrency(item.base_price)}</TableCell>
                  <TableCell className="py-3 text-right text-slate-600">{item.quantity} {item.uom}</TableCell>
                  <TableCell className="py-3 text-right text-slate-600">{item.tax_rate || 0}%</TableCell>
                  <TableCell className="py-3 text-right font-medium text-slate-800">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Net Amount:</span>
              <span>{formatCurrency(creditNote.net_amount)}</span>
            </div>
            {creditNote.cgst_amount > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>CGST:</span>
                <span>{formatCurrency(creditNote.cgst_amount)}</span>
              </div>
            )}
            {creditNote.sgst_amount > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>SGST:</span>
                <span>{formatCurrency(creditNote.sgst_amount)}</span>
              </div>
            )}
            {creditNote.igst_amount > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>IGST:</span>
                <span>{formatCurrency(creditNote.igst_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-3">
              <span>Grand Total:</span>
              <span>{formatCurrency(creditNote.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end">
          <div className="text-xs text-slate-500">
            <p className="font-semibold mb-1 text-slate-700">Terms & Conditions:</p>
            <p>1. This is a computer generated document.</p>
            <p>2. Subject to terms of return and refund policies.</p>
          </div>
          <div className="text-center">
            {/* Using a React style object for the border bottom as per standards */}
            <div 
              style={{ width: '12rem', borderBottom: '1px solid hsl(var(--border))', marginBottom: '0.5rem' }} 
            />
            <p className="text-xs font-semibold text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>
      
      {/* Print CSS explicitly for hiding non-printable stuff and formatting the page */}
      {/* Refactored to use standard dangerouslySetInnerHTML prop instead of invalid dangerouslySetInlineStyle */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
    </div>
  );
}