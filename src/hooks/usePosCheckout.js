import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

export const usePosCheckout = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const processSale = async ({ 
    cartItems, 
    totalAmount, 
    subtotal, 
    taxAmount, 
    discountAmount, 
    paymentMethod, 
    customer,
    cashDetails = null
  }) => {
    if (!user) return null;
    setIsProcessing(true);

    try {
      // 1. Create the sale record
      const { data: sale, error: saleError } = await supabase
        .from('point_of_sale_sales')
        .insert({
          user_id: user.id,
          customer_id: customer?.id || null,
          customer_phone: customer?.phone || null,
          total_amount: totalAmount,
          subtotal: subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          payment_method: paymentMethod,
          status: 'Completed',
          order_type: 'In-Store',
          billing_type: 'Standard'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Insert items and trigger stock updates via DB trigger
      const saleItems = cartItems.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        variant_id: item.selectedVariant?.id || null,
        quantity: item.quantity,
        unit_price: item.selling_price,
        tax_rate: item.tax_rate || 0,
        total_price: item.selling_price * item.quantity,
        is_refunded: false
      }));

      const { error: itemsError } = await supabase
        .from('point_of_sale_sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // 3. Return combined data for the receipt
      return {
        ...sale,
        items: cartItems,
        cash_received: cashDetails?.received,
        change_amount: cashDetails?.change
      };

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Could not complete the sale.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processSale, isProcessing };
};