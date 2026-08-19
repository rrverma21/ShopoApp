import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice, useCurrency } from "@/lib/utils";
import { Printer, Download, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

const ReceiptDialog = ({ open, onOpenChange, saleData, businessDetails }) => {
  const receiptRef = useRef();
  const { symbol } = useCurrency();

  if (!saleData) return null;

  const handlePrint = () => {
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${saleData.invoice_number || 'Sale'}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .separator { border-top: 1px dashed #000; margin: 10px 0; }
            .total { font-weight: bold; font-size: 14px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
        <div className="bg-green-600 p-6 text-center text-white">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Sale Successful!</h2>
          <p className="text-green-100 text-sm opacity-90">Transaction ID: {saleData.id?.slice(0, 8)}</p>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar" ref={receiptRef}>
          <div className="text-center space-y-1 mb-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 uppercase">
              {businessDetails?.business_name || "RETAIL SHOP"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
              {businessDetails?.business_address || "Store Location"}
            </p>
            {businessDetails?.phone && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Tel: {businessDetails.phone}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
              <span>Item Description</span>
              <span>Total</span>
            </div>
            <Separator className="bg-slate-100 dark:bg-slate-800" />
            
            <div className="space-y-3">
              {saleData.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {item.name || item.product_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.quantity} x {formatPrice(item.unit_price || item.price)}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatPrice((item.quantity * (item.unit_price || item.price)))}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900 dark:text-slate-100">{formatPrice(saleData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span className="text-slate-900 dark:text-slate-100">{formatPrice(saleData.tax_amount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">TOTAL</span>
                <span className="text-xl font-black text-primary">
                  {formatPrice(saleData.total_amount)}
                </span>
              </div>
            </div>

            <Separator className="bg-slate-100 dark:bg-slate-800 border-dashed" />

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">
                  {saleData.payment_method}
                </span>
              </div>
              {saleData.cash_received && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Cash Received</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {formatPrice(saleData.cash_received)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Change Returned</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">
                      {formatPrice(saleData.change_amount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex-1 h-11"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 bg-primary hover:bg-primary/90"
          >
            New Sale
            <ShoppingBag className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;