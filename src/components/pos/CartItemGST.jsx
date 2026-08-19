import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle, Info } from 'lucide-react';
import { formatPrice, isServiceProduct } from '@/lib/utils';
import { validateHSNCode, validateGSTRate } from '@/utils/posValidation';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * CartItemGST Component
 * Renders cart item with GST-specific fields for GST Invoice mode
 */
const CartItemGST = ({ item, onUpdate, onRemove, onQuantityUpdate }) => {
  const [localHSN, setLocalHSN] = useState(item.hsn_code || '');
  const [localGSTRate, setLocalGSTRate] = useState(
    item.gst_rate !== null && item.gst_rate !== undefined ? item.gst_rate : 18
  );
  const [hsnError, setHsnError] = useState('');
  const [gstRateError, setGstRateError] = useState('');

  useEffect(() => {
    setLocalHSN(item.hsn_code || '');
    setLocalGSTRate(
      item.gst_rate !== null && item.gst_rate !== undefined ? item.gst_rate : 18
    );
  }, [item.hsn_code, item.gst_rate]);

  const calculateGSTAmounts = (quantity, unitPrice, gstRate) => {
    const taxableValue = quantity * unitPrice;
    const gstAmount = (taxableValue * gstRate) / 100;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const itemTotal = taxableValue + gstAmount;

    return {
      taxableValue: parseFloat(taxableValue.toFixed(2)),
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      itemTotal: parseFloat(itemTotal.toFixed(2))
    };
  };

  const handleHSNChange = (value) => {
    setLocalHSN(value);
    const validation = validateHSNCode(value);
    
    if (!validation.valid && value.trim() !== '') {
      setHsnError(validation.error);
    } else {
      setHsnError('');
      onUpdate({
        ...item,
        hsn_code: value.trim()
      });
    }
  };

  const handleGSTRateChange = (value) => {
    const rate = parseInt(value);
    setLocalGSTRate(rate);
    
    const validation = validateGSTRate(rate);
    if (!validation.valid) {
      setGstRateError(validation.error);
    } else {
      setGstRateError('');
      onUpdate({
        ...item,
        gst_rate: rate,
        tax_rate: rate
      });
    }
  };

  const unitPrice = item.unitFinalPrice || item.selling_price || 0;
  const gstCalculations = calculateGSTAmounts(item.quantity, unitPrice, localGSTRate);

  return (
    <div className="p-4 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-3">
      {/* Product Info Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
            {item.name}
          </h4>
          {item.variantBarcode && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {item.variantBarcode}
            </span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(item.cartItemId)}
          className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* GST Fields Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-600 dark:text-slate-400">
            Quantity
          </Label>
          <Input
            type="number"
            step="0.001"
            value={item.quantity}
            onChange={(e) => onQuantityUpdate(item.cartItemId, parseFloat(e.target.value) || 0)}
            className="h-9 text-sm"
            min="0"
          />
          <p className="text-[10px] text-slate-500">
            {isServiceProduct(item) ? (
              <span className="text-blue-500 font-medium">Service Item</span>
            ) : (
              `Stock: ${item.stock_level || 0}`
            )}
          </p>
        </div>

        {/* Unit Price */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-600 dark:text-slate-400">
            Unit Price (₹)
          </Label>
          <Input
            type="number"
            value={unitPrice}
            readOnly
            className="h-9 text-sm bg-slate-50 dark:bg-slate-800/50"
          />
        </div>

        {/* HSN/SAC Code */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              HSN/SAC Code
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    <strong>HSN (Harmonized System of Nomenclature):</strong> Classification code for goods (4, 6, or 8 digits).
                    <br/><br/>
                    <strong>SAC (Service Accounting Code):</strong> Classification code for services (6 digits).
                    <br/><br/>
                    Example: 1006 (Rice), 998314 (Consulting)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            type="text"
            value={localHSN}
            onChange={(e) => handleHSNChange(e.target.value)}
            placeholder="e.g. 1006"
            className={`h-9 text-sm ${hsnError ? 'border-red-500' : ''}`}
            maxLength={8}
          />
          {hsnError && (
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {hsnError}
            </p>
          )}
        </div>

        {/* GST Rate */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              GST Rate
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    <strong>GST Rate Slabs:</strong><br/>
                    • 0%: Essential items (bread, milk)<br/>
                    • 5%: Daily necessities (rice, tea)<br/>
                    • 12%: Processed foods<br/>
                    • 18%: Most goods and services<br/>
                    • 28%: Luxury items
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={String(localGSTRate)} onValueChange={handleGSTRateChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="12">12%</SelectItem>
              <SelectItem value="18">18%</SelectItem>
              <SelectItem value="28">28%</SelectItem>
            </SelectContent>
          </Select>
          {gstRateError && (
            <p className="text-[10px] text-red-500">{gstRateError}</p>
          )}
        </div>
      </div>

      {/* GST Calculation Summary */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>Taxable Value:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatPrice(gstCalculations.taxableValue)}
          </span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>CGST ({localGSTRate / 2}%):</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {formatPrice(gstCalculations.cgst)}
          </span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>SGST ({localGSTRate / 2}%):</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {formatPrice(gstCalculations.sgst)}
          </span>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between font-semibold text-slate-900 dark:text-slate-100">
          <span>Item Total:</span>
          <span className="text-green-600 dark:text-green-400">
            {formatPrice(gstCalculations.itemTotal)}
          </span>
        </div>
      </div>

      {/* Discount Badges */}
      {item.discountLabel && (
        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
          {item.discountLabel}
        </Badge>
      )}
    </div>
  );
};

export default CartItemGST;