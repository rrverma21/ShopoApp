import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackageX, X, Plus, Box, AlertCircle, User, Calendar, Store } from 'lucide-react';
import ProductGridModal from './ProductGridModal';

const RETURN_REASONS = [
  "Damaged",
  "Expired",
  "Wrong Item",
  "Other"
];

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1556742504-16b083241fab",
  "https://images.unsplash.com/photo-1618063229822-53ae138e7f12"
];

const ReturnOrderForm = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

  // Form Fields - Using IDs for select state to ensure uniqueness
  const [executiveId, setExecutiveId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [retailerId, setRetailerId] = useState('');

  // Dropdown Data States
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Fetch employees and customers for dropdowns
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!user?.id) return;

      // Fetch Employees for Executive Name
      try {
        setIsLoadingEmployees(true);
        const { data, error } = await supabase
          .from('employees')
          .select('id, name')
          .eq('user_id', user.id);
        
        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        console.error('Error fetching employees:', err);
        toast({
          title: "Failed to load executives",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setIsLoadingEmployees(false);
      }

      // Fetch Customers for Retailer Name field
      try {
        setIsLoadingCustomers(true);
        const { data, error } = await supabase
          .from('point_of_sale_customers')
          .select('id, name')
          .eq('user_id', user.id);
        
        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error('Error fetching customers:', err);
        toast({
          title: "Failed to load customers",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchDropdownData();
  }, [user, toast]);

  // Fetch products for the grid modal
  useEffect(() => {
    const fetchProducts = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('point_of_sale_products')
          .select('id, name, sku, wholesale_price, image_url, stock_level')
          .eq('archived', false)
          .eq('user_id', user.id);
          
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    
    fetchProducts();
  }, [user]);

  const handleProductSelect = (product) => {
    if (selectedItems.some(item => item.product_id === product.id)) {
      toast({
        title: "Product already added",
        description: "You can adjust the quantity below.",
        variant: "default"
      });
      setIsGridModalOpen(false);
      return;
    }
    
    setSelectedItems(prev => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        quantity: 1,
        reason: '',
        comments: ''
      }
    ]);
    
    setIsGridModalOpen(false);
  };

  const handleRemoveProduct = (productId) => {
    setSelectedItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const handleItemChange = (productId, field, value) => {
    setSelectedItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, [field]: value } : item
    ));
  };

  // Form Submission Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to return.",
        variant: "destructive"
      });
      return;
    }

    // Validation: Ensure dropdown values are selected using unique IDs
    if (!executiveId || !bookingDate || !retailerId) {
      toast({
        title: "Missing Details",
        description: "Please select the Executive Name, Booking Date, and Customer Name.",
        variant: "destructive"
      });
      return;
    }

    // Validate all items have required fields
    const invalidItem = selectedItems.find(item => !item.quantity || item.quantity <= 0 || !item.reason);
    if (invalidItem) {
      toast({
        title: "Incomplete details",
        description: "Please provide a valid quantity and reason for all items.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = selectedItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: parseInt(item.quantity, 10),
        reason: item.reason,
        comments: item.comments
      }));

      // Retrieve actual names for submission payload based on selected IDs
      const executiveName = employees.find(emp => String(emp.id) === String(executiveId))?.name || '';
      const retailerName = customers.find(cust => String(cust.id) === String(retailerId))?.name || '';

      // Submit return order via RPC
      const { error } = await supabase.rpc('create_multi_item_return', {
        p_items: payload,
        p_booked_order_id: null, // Using global catalog
        p_executive_name: executiveName,
        p_booking_date: bookingDate || null,
        p_retailer_name: retailerName // Backend payload expects p_retailer_name
      });

      if (error) throw error;

      toast({
        title: "Return Submitted",
        description: "Your return order has been submitted successfully.",
        className: "bg-green-50 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-100"
      });
      
      // Reset form
      setSelectedItems([]);
      setExecutiveId('');
      setRetailerId('');
      if (onSuccess) onSuccess();
      
    } catch (err) {
      console.error('Submit error:', err);
      toast({
        title: "Failed to submit return",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="bg-rose-100 dark:bg-rose-900/30 p-2.5 rounded-lg text-rose-600 dark:text-rose-400">
          <PackageX className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Initiate Multi-Item Return</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Provide details and select products to request a return</p>
        </div>
      </div>

      <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Order Meta Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
            
            {/* Executive Name Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="executiveName" className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                Executive Name
              </Label>
              <Select value={executiveId} onValueChange={setExecutiveId} disabled={isLoadingEmployees}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading executives..." : "Select executive"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp, index) => {
                    const uniqueId = String(emp.id || `emp-${index}`);
                    return (
                      <SelectItem key={uniqueId} value={uniqueId}>
                        {emp.name}
                      </SelectItem>
                    );
                  })}
                  {employees.length === 0 && !isLoadingEmployees && (
                    <SelectItem value="none" disabled>No executives found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Booking Date */}
            <div className="space-y-2">
              <Label htmlFor="bookingDate" className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Booking Date
              </Label>
              <Input 
                id="bookingDate" 
                type="date" 
                value={bookingDate} 
                onChange={(e) => setBookingDate(e.target.value)} 
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
                required
              />
            </div>

            {/* Customer/Retailer Name Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="retailerName" className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-slate-400" />
                Customer Name
              </Label>
              <Select value={retailerId} onValueChange={setRetailerId} disabled={isLoadingCustomers}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer, index) => {
                    const uniqueId = String(customer.id || `cust-${index}`);
                    return (
                      <SelectItem key={uniqueId} value={uniqueId}>
                        {customer.name}
                      </SelectItem>
                    );
                  })}
                  {customers.length === 0 && !isLoadingCustomers && (
                    <SelectItem value="none" disabled>No customers found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Box className="w-5 h-5 text-slate-500" /> 
                Products to Return ({selectedItems.length})
              </h3>
              <Button 
                type="button" 
                onClick={() => setIsGridModalOpen(true)} 
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </div>
            
            {selectedItems.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Click the 'Add Product' button to select items for your return request.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((item, index) => (
                  <div key={item.product_id} className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 group">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-full"
                      onClick={() => handleRemoveProduct(item.product_id)}
                      aria-label="Remove product"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                        <img 
                          src={item.image_url || DEFAULT_IMAGES[index % DEFAULT_IMAGES.length]} 
                          alt={item.product_name} 
                          className="h-full w-full object-cover"
                          onError={(e) => { e.target.src = DEFAULT_IMAGES[index % DEFAULT_IMAGES.length]; }}
                        />
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 pr-8">
                          {item.product_name}
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor={`qty-${item.product_id}`} className="text-xs text-slate-500 dark:text-slate-400">Quantity</Label>
                            <Input
                              id={`qty-${item.product_id}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.product_id, 'quantity', e.target.value)}
                              className="h-9 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                              required
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label htmlFor={`reason-${item.product_id}`} className="text-xs text-slate-500 dark:text-slate-400">Reason</Label>
                            <select
                              id={`reason-${item.product_id}`}
                              value={item.reason}
                              onChange={(e) => handleItemChange(item.product_id, 'reason', e.target.value)}
                              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:ring-slate-300 text-slate-900 dark:text-slate-100"
                              required
                            >
                              <option value="" disabled>Select reason</option>
                              {RETURN_REASONS.map(reason => (
                                <option key={reason} value={reason} className="dark:bg-slate-900">{reason}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor={`comments-${item.product_id}`} className="text-xs text-slate-500 dark:text-slate-400">Comments (Optional)</Label>
                          <Textarea
                            id={`comments-${item.product_id}`}
                            value={item.comments}
                            onChange={(e) => handleItemChange(item.product_id, 'comments', e.target.value)}
                            placeholder="Provide details about the issue..."
                            className="h-16 resize-none text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Cancel
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={isSubmitting || selectedItems.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Return...
                </>
              ) : (
                'Submit Return Request'
              )}
            </Button>
          </div>
        </form>
      </div>

      <ProductGridModal 
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        products={products}
        onSelectProduct={handleProductSelect}
      />
    </div>
  );
};

export default ReturnOrderForm;