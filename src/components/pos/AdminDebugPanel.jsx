import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminDebugPanel = ({ cart, subtotalOriginal, totalDiscount, subtotalFinal }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only show if user is an admin
  if (user?.profile?.role !== 'admin' && user?.user_metadata?.role !== 'admin') {
    return null;
  }

  return (
    <Card className="mt-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
      <CardHeader className="cursor-pointer py-3 hover:bg-red-100/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
         <CardTitle className="flex items-center justify-between text-red-700 dark:text-red-400 text-sm">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> 
              Admin Debug: POS Pricing Validation
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
         </CardTitle>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="overflow-x-auto text-xs pb-3">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Offer ID</TableHead>
                        <TableHead>Offer Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Orig Unit</TableHead>
                        <TableHead>Disc/Unit</TableHead>
                        <TableHead>Final Unit</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Line Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cart.map((item, idx) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium max-w-[120px] truncate" title={item.name}>{item.name}</TableCell>
                            <TableCell className="font-mono text-[10px] text-muted-foreground">{item.appliedOfferId || 'None'}</TableCell>
                            <TableCell className="max-w-[100px] truncate" title={item.appliedOfferName || 'No offer'}>{item.appliedOfferName || 'No offer'}</TableCell>
                            <TableCell>{item.appliedOfferType || 'None'}</TableCell>
                            <TableCell>{formatPrice(item.unitOriginalPrice || item.selling_price || 0)}</TableCell>
                            <TableCell className="text-red-600">
                              {formatPrice((item.unitOriginalPrice || item.selling_price || 0) - (item.unitFinalPrice || item.selling_price || 0))}
                            </TableCell>
                            <TableCell className="font-semibold text-green-700">{formatPrice(item.unitFinalPrice || item.selling_price || 0)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="font-bold">{formatPrice(item.lineSubtotal || ((item.unitFinalPrice || item.selling_price || 0) * item.quantity))}</TableCell>
                        </TableRow>
                    ))}
                    {cart.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">Cart is empty</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <div className="mt-4 p-3 bg-white/60 dark:bg-black/20 rounded border border-red-100 flex flex-wrap justify-between gap-4 font-mono text-sm">
                <div>MRP Subtotal: <span className="font-bold">{formatPrice(subtotalOriginal)}</span></div>
                <div>Total Discount: <span className="font-bold text-red-600">-{formatPrice(totalDiscount)}</span></div>
                <div>Final Payable Amount: <span className="font-bold text-green-600">{formatPrice(subtotalFinal)}</span></div>
            </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdminDebugPanel;