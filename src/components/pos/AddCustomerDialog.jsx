import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AddressForm from '@/components/forms/AddressForm';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';

const AddCustomerDialog = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (data) => {
    if (!user) throw new Error("Authentication required");

    // Construct full address payload
    const addressData = {
      street: data.streetAddress,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country
    };

    const addressString = [
      data.streetAddress, 
      data.city, 
      data.state, 
      data.pincode
    ].filter(Boolean).join(', ');

    const { data: newCustomer, error } = await supabase
      .from('point_of_sale_customers')
      .insert([{
        user_id: user.id,
        name: data.streetAddress.split(' ')[0] || 'Customer', // Simple fallback for name if we only collected address
        phone: data.phone,
        address: addressString,
        customer_billing_address: JSON.stringify(addressData),
        customer_shipping_address: JSON.stringify(addressData)
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (onSuccess) {
      onSuccess(newCustomer);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 border-0 bg-transparent shadow-none">
        <AddressForm 
          title="Add New Customer" 
          description="Enter customer contact and address details" 
          onSubmit={handleSubmit} 
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;