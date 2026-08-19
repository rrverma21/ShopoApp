import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CreditCard, Banknote, Smartphone, Globe, Layers, Zap } from 'lucide-react';

const PaymentMethodSelector = ({ settings, gateways, selectedMethod, onSelect }) => {
  const getIcon = (type) => {
    switch(type) {
        case 'razorpay': return <Globe className="w-5 h-5 text-blue-600" />;
        case 'paytm': return <Smartphone className="w-5 h-5 text-sky-500" />;
        case 'stripe': return <CreditCard className="w-5 h-5 text-indigo-600" />;
        case 'cashfree': return <Zap className="w-5 h-5 text-orange-500" />;
        case 'payu': return <Layers className="w-5 h-5 text-green-600" />;
        case 'other': return <Banknote className="w-5 h-5 text-gray-600" />;
        default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const getLabel = (type) => {
    switch(type) {
        case 'razorpay': return "Razorpay";
        case 'paytm': return "Paytm";
        case 'stripe': return "Stripe";
        case 'cashfree': return "Cashfree Payments";
        case 'payu': return "PayU";
        case 'other': return "Other Method";
        default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedMethod} onValueChange={onSelect} className="grid grid-cols-1 gap-3">
        {/* Cash On Delivery Option */}
        {settings?.cod_enabled && (
          <div className={cn(
            "flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-50",
            selectedMethod === 'cod' ? "border-green-600 bg-green-50/30 ring-1 ring-green-600" : "border-slate-200"
          )}>
            <RadioGroupItem value="cod" id="cod" className="text-green-600" />
            <div className="flex-1 cursor-pointer" onClick={() => onSelect('cod')}>
                <Label htmlFor="cod" className="cursor-pointer font-bold text-slate-900 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-600" /> Cash on Delivery
                </Label>
                <p className="text-xs text-slate-500 mt-1">Pay when you receive the order.</p>
            </div>
          </div>
        )}

        {/* Online Payment Options */}
        {settings?.online_payments_enabled && gateways?.map(gateway => (
           <div key={gateway.gateway_type} className={cn(
            "flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-50",
            selectedMethod === gateway.gateway_type ? "border-blue-600 bg-blue-50/30 ring-1 ring-blue-600" : "border-slate-200"
          )}>
            <RadioGroupItem value={gateway.gateway_type} id={gateway.gateway_type} className="text-blue-600" />
            <div className="flex-1 cursor-pointer" onClick={() => onSelect(gateway.gateway_type)}>
                <Label htmlFor={gateway.gateway_type} className="cursor-pointer font-bold text-slate-900 flex items-center gap-2 capitalize">
                    {getIcon(gateway.gateway_type)} {getLabel(gateway.gateway_type)}
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                    Secure online payment via {getLabel(gateway.gateway_type)}
                    {gateway.test_mode && <span className="ml-2 text-amber-600 font-bold">(Test Mode)</span>}
                </p>
            </div>
          </div>
        ))}

        {!settings?.cod_enabled && (!gateways || gateways.length === 0) && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm text-center">
                No payment methods available. Please contact the shop.
            </div>
        )}
      </RadioGroup>
    </div>
  );
};

export default PaymentMethodSelector;