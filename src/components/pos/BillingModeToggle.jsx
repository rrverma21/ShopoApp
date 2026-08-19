import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useRegion } from '@/contexts/RegionContext';
import { getRegionConfig } from '@/utils/regionConfig';

const getTaxTypeLabel = (taxType) => {
  if (!taxType) return 'GST';
  const normalized = taxType.toLowerCase().replace('_', ' ');
  switch (normalized) {
    case 'vat': 
      return 'VAT';
    case 'sales tax': 
      return 'Sales Tax';
    case 'sst': 
      return 'SST';
    case 'consumption tax': 
      return 'Consumption Tax';
    case 'gst':
    default: 
      return 'GST';
  }
};

const BillingModeToggle = ({ mode, onChange }) => {
  const isGst = mode === 'gst';
  const { cartItems } = useCart();
  
  // Get region and tax configuration
  const regionContext = useRegion();
  const currentRegion = regionContext?.currentRegion || 'India';
  const regionConfig = getRegionConfig(currentRegion);
  const taxTypeRaw = regionConfig?.tax?.name || 'GST';
  const taxLabel = getTaxTypeLabel(taxTypeRaw);
  
  // State variable to track whether the current mode is auto-detected or manually selected
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Create a signature of the cart to detect relevant changes (add/remove/tax change/clear).
  // Quantity changes don't change this signature, avoiding unnecessary mode resets.
  const cartSignature = cartItems.map(item => `${item.id}-${item.product?.tax_rate || item.tax_rate || 0}`).join('|');

  useEffect(() => {
    // 1. Monitor the cart context for product changes
    // 2. Auto-detection logic: check if any product has tax_rate > 0
    const hasGstItems = cartItems.some(item => {
      const taxRate = parseFloat(item.product?.tax_rate || item.tax_rate || 0);
      return taxRate > 0;
    });

    const expectedMode = hasGstItems ? 'gst' : 'non-gst';

    // 3. Trigger auto-detection on cart changes
    // Reset manual override flag since cart contents changed
    setIsManualOverride(false);

    // Apply auto-detected mode if it differs from the current mode
    if (mode !== expectedMode) {
      onChange(expectedMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature]); // Effect only runs when products are added/removed/cleared or tax rates change

  const handleManualToggle = (checked) => {
    // 4. Manual Override Logic
    // Set flag indicating manual override. This selection persists because
    // changing the switch doesn't change the cartSignature dependency above.
    setIsManualOverride(true);
    onChange(checked ? 'gst' : 'non-gst');
  };

  return (
    <div className="hidden md:flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900 shadow-xl w-full transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
          isGst ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
        )}>
          {isGst ? <Scale className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex flex-col">
          <Label htmlFor="billing-mode-toggle" className="text-sm font-semibold cursor-pointer text-slate-50">
            {isGst ? `${taxLabel} Billing` : `Non-${taxLabel} Billing`}
          </Label>
          <span className="text-[10px] text-slate-400 font-medium">
            {isGst ? "Tax included in calculations" : "Tax excluded from calculations"}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-full border border-slate-700">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider transition-colors", 
          !isGst ? "text-emerald-400" : "text-slate-500"
        )}>
          Non-{taxLabel}
        </span>
        <Switch 
          id="billing-mode-toggle"
          checked={isGst} 
          onCheckedChange={handleManualToggle}
          className={cn(
            "data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-emerald-500",
            "border-transparent"
          )}
        />
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider transition-colors", 
          isGst ? "text-amber-400" : "text-slate-500"
        )}>
          {taxLabel}
        </span>
      </div>
    </div>
  );
};

export default BillingModeToggle;