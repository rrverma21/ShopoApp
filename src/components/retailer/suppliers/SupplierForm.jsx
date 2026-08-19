import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SupplierForm = ({ supplier, onSave, onCancel }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    payment_terms: '',
    notes: ''
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        pincode: supplier.pincode || '',
        gst_number: supplier.gst_number || '',
        payment_terms: supplier.payment_terms || '',
        notes: supplier.notes || ''
      });
    }
  }, [supplier]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Supplier Name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number (10 digits expected)';
    }
    if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      newErrors.gst_number = 'Invalid GST format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        seller_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (supplier?.id) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id);
        if (error) throw error;
        window.alert('Success: Supplier updated successfully');
      } else {
        const { error } = await supabase.from('suppliers').insert([payload]);
        if (error) throw error;
        window.alert('Success: Supplier added successfully');
      }
      onSave();
    } catch (err) {
      console.error(err);
      window.alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Supplier Name <span className="text-red-500">*</span></Label>
          <Input name="name" value={formData.name} onChange={handleChange} placeholder="Business Name" className={errors.name ? 'border-red-500' : ''} />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label>Contact Person</Label>
          <Input name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="Contact Person Name" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className={errors.email ? 'border-red-500' : ''} />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit Phone Number" className={errors.phone ? 'border-red-500' : ''} />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Address</Label>
          <Input name="address" value={formData.address} onChange={handleChange} placeholder="Street Address" />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input name="city" value={formData.city} onChange={handleChange} placeholder="City" />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input name="state" value={formData.state} onChange={handleChange} placeholder="State" />
        </div>
        <div className="space-y-2">
          <Label>Pincode</Label>
          <Input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" />
        </div>
        <div className="space-y-2">
          <Label>GST Number</Label>
          <Input name="gst_number" value={formData.gst_number} onChange={handleChange} placeholder="GSTIN" className={errors.gst_number ? 'border-red-500' : ''} />
          {errors.gst_number && <p className="text-xs text-red-500">{errors.gst_number}</p>}
        </div>
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Input name="payment_terms" value={formData.payment_terms} onChange={handleChange} placeholder="e.g. Net 30, Cash" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <Textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional information..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Supplier
        </Button>
      </div>
    </form>
  );
};

export default SupplierForm;