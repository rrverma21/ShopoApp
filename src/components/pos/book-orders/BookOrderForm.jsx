import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Plus, Save, Check, ChevronsUpDown, UploadCloud, Search, Image as ImageIcon, MapPin, Phone, Building2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import ProductGridModal from './ProductGridModal';

const BookOrderForm = ({ initialData, onSave, onCancel }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    booking_date: new Date().toISOString().split('T')[0],
    retailer_name: '',
    notes: '',
    executive_name: initialData?.executive_name || '',
    ...initialData
  });

  const [items, setItems] = useState(initialData?.order_items || [
    { product_id: '', product_name: '', quantity: 1, unit_price: 0, line_total: 0, image_url: null }
  ]);
  
  const [products, setProducts] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [isLoadingExecs, setIsLoadingExecs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combobox & Dialog state for Retailers
  const [isRetailerOpen, setIsRetailerOpen] = useState(false);
  const [isAddRetailerOpen, setIsAddRetailerOpen] = useState(false);
  
  const [newRetailerName, setNewRetailerName] = useState('');
  const [newRetailerPhone, setNewRetailerPhone] = useState('');
  const [newRetailerAddress, setNewRetailerAddress] = useState('');
  const [newRetailerLandmark, setNewRetailerLandmark] = useState('');
  const [newRetailerImage, setNewRetailerImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [isSavingRetailer, setIsSavingRetailer] = useState(false);

  // Product Grid Modal state
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('point_of_sale_products')
        .select('id, name, sku, wholesale_price, image_url, stock_level')
        .eq('archived', false)
        .eq('user_id', user.id);
      
      if (!error && data) {
        setProducts(data);
      } else if (error) {
        console.error("Error fetching products:", error);
      }
    };
    
    const fetchExecutives = async () => {
      if (!user?.id) return;
      setIsLoadingExecs(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setExecutives(data);
      }
      setIsLoadingExecs(false);
    };

    const fetchRetailers = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('point_of_sale_customers')
        .select('id, name, phone, address, landmark, shop_image_url')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
        
      if (!error && data) {
        setRetailers(data);
      }
    };

    fetchProducts();
    fetchExecutives();
    fetchRetailers();
  }, [user]);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      item.line_total = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleProductSelectFromGrid = (product) => {
    if (activeRowIndex === null) return;
    
    const newItems = [...items];
    const item = { ...newItems[activeRowIndex] };
    
    const wholesalePrice = Number(product.wholesale_price) || 0;
    
    item.product_id = product.id;
    item.product_name = product.name;
    item.unit_price = wholesalePrice;
    item.image_url = product.image_url;
    item.line_total = (Number(item.quantity) || 1) * wholesalePrice;
    
    newItems[activeRowIndex] = item;
    setItems(newItems);
    setIsGridModalOpen(false);
    
    toast.success(`Selected ${product.name}`, { duration: 1500 });
  };

  const openProductGrid = (index) => {
    setActiveRowIndex(index);
    setIsGridModalOpen(true);
  };

  const addItemWithGrid = () => {
    const newIndex = items.length;
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, line_total: 0, image_url: null }]);
    setActiveRowIndex(newIndex);
    setIsGridModalOpen(true);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      setItems([{ product_id: '', product_name: '', quantity: 1, unit_price: 0, line_total: 0, image_url: null }]);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewRetailerImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveNewRetailer = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newRetailerName.trim()) {
      toast.error("Retailer name is required");
      return;
    }
    
    setIsSavingRetailer(true);
    try {
      let shop_image_url = null;

      if (newRetailerImage) {
        const fileExt = newRetailerImage.name.split('.').pop();
        const fileName = `retailer_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(filePath, newRetailerImage);

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          toast.error("Failed to upload shop image");
        } else if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          shop_image_url = publicUrlData.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('point_of_sale_customers')
        .insert([{ 
          user_id: user.id, 
          name: newRetailerName.trim(), 
          phone: newRetailerPhone.trim() || null,
          address: newRetailerAddress.trim() || null,
          landmark: newRetailerLandmark.trim() || null,
          shop_image_url: shop_image_url
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setRetailers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, retailer_name: data.name }));
      setIsAddRetailerOpen(false);
      
      setNewRetailerName('');
      setNewRetailerPhone('');
      setNewRetailerAddress('');
      setNewRetailerLandmark('');
      setNewRetailerImage(null);
      setImagePreview(null);
      
      toast.success("Retailer added successfully");
    } catch (error) {
      console.error("Error adding retailer:", error);
      toast.error("Failed to add retailer");
    } finally {
      setIsSavingRetailer(false);
    }
  };

  const selectedRetailerInfo = useMemo(() => {
    if (!formData.retailer_name) return null;
    return retailers.find(r => r.name.toLowerCase() === formData.retailer_name.toLowerCase());
  }, [formData.retailer_name, retailers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.executive_name) return toast.error("Executive name is required");
    if (!formData.retailer_name.trim()) return toast.error("Retailer name is required");
    
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) return toast.error("Please add at least one valid product");

    try {
      setIsSubmitting(true);
      
      const cleanedItems = validItems.map(({ image_url, ...rest }) => rest);

      const payload = {
        user_id: user.id,
        executive_name: formData.executive_name,
        booking_date: formData.booking_date,
        retailer_name: formData.retailer_name,
        customer_phone: selectedRetailerInfo?.phone || null,
        order_status: initialData?.id ? (initialData.order_status || 'Pending') : 'Pending', // Force 'Pending' for new orders
        notes: formData.notes,
        order_items: cleanedItems,
        order_total: calculateTotal()
      };

      if (initialData?.id) {
        const { error } = await supabase.from('booked_orders').update(payload).eq('id', initialData.id);
        if (error) throw error;
        toast.success("Order updated successfully!");
      } else {
        const { error } = await supabase.from('booked_orders').insert([payload]);
        if (error) throw error;
        toast.success("Order booked successfully!");
      }
      
      onSave();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executiveOptions = [...executives];
  if (formData.executive_name && !executiveOptions.some(e => e.name === formData.executive_name)) {
    executiveOptions.unshift({ id: 'current', name: formData.executive_name });
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      <form onSubmit={handleSubmit} className="space-y-6" id="book-order-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Executive Name <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.executive_name} 
              onValueChange={v => setFormData({...formData, executive_name: v})}
              disabled={isLoadingExecs}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingExecs ? "Loading employees..." : "Select Employee"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingExecs ? (
                  <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                ) : executiveOptions.length === 0 ? (
                  <SelectItem value="none" disabled>No Employees found</SelectItem>
                ) : (
                  executiveOptions.map(exec => (
                    <SelectItem key={exec.id} value={exec.name}>{exec.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Booking Date</Label>
            <Input 
              type="date" 
              value={formData.booking_date} 
              onChange={e => setFormData({...formData, booking_date: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2 flex flex-col md:col-span-2 lg:col-span-1">
            <Label>Retailer Name <span className="text-red-500">*</span></Label>
            <div className="flex gap-2 w-full">
              <Popover open={isRetailerOpen} onOpenChange={setIsRetailerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isRetailerOpen}
                    className="flex-1 justify-between font-normal bg-white dark:bg-slate-950"
                  >
                    <span className="truncate">
                      {formData.retailer_name || "Select retailer..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search retailer..." />
                    <CommandList>
                      <CommandEmpty>No retailer found.</CommandEmpty>
                      <CommandGroup>
                        {retailers.map((retailer) => (
                          <CommandItem
                            key={retailer.id}
                            value={retailer.name}
                            onSelect={(currentValue) => {
                              const selected = retailers.find(
                                r => r.name.toLowerCase() === currentValue.toLowerCase()
                              );
                              setFormData({
                                ...formData, 
                                retailer_name: selected ? selected.name : currentValue
                              });
                              setIsRetailerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.retailer_name?.toLowerCase() === retailer.name.toLowerCase() 
                                  ? "opacity-100" 
                                  : "opacity-0"
                              )}
                            />
                            {retailer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Dialog open={isAddRetailerOpen} onOpenChange={setIsAddRetailerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" type="button" className="shrink-0 px-3 bg-white dark:bg-slate-950">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                  <form onSubmit={handleSaveNewRetailer} className="flex flex-col h-full">
                    <DialogHeader>
                      <DialogTitle>Add New Retailer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
                      <div className="space-y-2">
                        <Label>Retailer Name <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="Enter firm or retailer name" 
                          value={newRetailerName} 
                          onChange={(e) => setNewRetailerName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number (Optional)</Label>
                        <Input 
                          placeholder="Enter phone number" 
                          value={newRetailerPhone} 
                          onChange={(e) => setNewRetailerPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address (Optional)</Label>
                        <Input 
                          placeholder="Street address or location" 
                          value={newRetailerAddress} 
                          onChange={(e) => setNewRetailerAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Landmark (Optional)</Label>
                        <Input 
                          placeholder="Nearby landmark" 
                          value={newRetailerLandmark} 
                          onChange={(e) => setNewRetailerLandmark(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Shop Image (Optional)</Label>
                        <div className="mt-1 flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 relative overflow-hidden transition-colors">
                            {imagePreview ? (
                              <img src={imagePreview} alt="Shop Preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG or WEBP</p>
                              </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                          </label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddRetailerOpen(false)}
                        disabled={isSavingRetailer}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSavingRetailer}
                      >
                        {isSavingRetailer ? "Saving..." : "Save Retailer"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Retailer Info Box */}
            {selectedRetailerInfo && (
              <div className="retailer-info-box mt-3">
                <h4 className="font-semibold text-sm flex items-center gap-1.5 text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Retailer Details
                </h4>
                <div className="grid grid-cols-1 gap-2.5 text-sm">
                  {selectedRetailerInfo.phone ? (
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <Phone className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block mb-0.5">Contact</span>
                        {selectedRetailerInfo.phone}
                      </div>
                    </div>
                  ) : null}
                  
                  {selectedRetailerInfo.address || selectedRetailerInfo.landmark ? (
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block mb-0.5">Location</span>
                        {selectedRetailerInfo.address && <span>{selectedRetailerInfo.address}</span>}
                        {selectedRetailerInfo.address && selectedRetailerInfo.landmark && <span>, </span>}
                        {selectedRetailerInfo.landmark && <span className="italic text-slate-500 dark:text-slate-400">Near {selectedRetailerInfo.landmark}</span>}
                      </div>
                    </div>
                  ) : null}

                  {!selectedRetailerInfo.phone && !selectedRetailerInfo.address && !selectedRetailerInfo.landmark && (
                    <div className="text-amber-600 dark:text-amber-400/90 italic flex items-center justify-center py-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-100 dark:border-amber-900/30">
                      No additional details recorded for this retailer.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Order Items</h3>
            <Button type="button" onClick={addItemWithGrid} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
          
          <div className="hidden sm:block space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 transition-all hover:shadow-sm">
                <div className="flex-1 w-full space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Product</Label>
                  <div 
                    onClick={() => openProductGrid(idx)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm",
                      !item.product_name && "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 hover:bg-slate-100"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProductGrid(idx);
                      }
                    }}
                  >
                    {item.product_name ? (
                      <span className="truncate text-foreground font-medium flex items-center gap-2.5">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-6 h-6 rounded bg-slate-100 object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                        {item.product_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2 font-medium">
                        <Search className="w-4 h-4 opacity-50" />
                        Select Product...
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-24 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Qty</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={item.quantity} 
                    onChange={e => handleItemChange(idx, 'quantity', e.target.value)} 
                    className="font-medium text-center bg-white dark:bg-slate-950 shadow-sm"
                  />
                </div>
                <div className="w-full sm:w-32 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unit Price</Label>
                  <Input 
                    type="number" 
                    value={item.unit_price} 
                    onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} 
                    className="font-mono bg-white dark:bg-slate-950 shadow-sm"
                  />
                </div>
                <div className="w-full sm:w-32 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total</Label>
                  <Input 
                    value={formatCurrency(item.line_total)} 
                    disabled 
                    className="bg-slate-100 dark:bg-slate-900/50 font-mono font-bold text-primary opacity-100 border-transparent" 
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0 h-10 w-10" 
                  onClick={() => removeItem(idx)}
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="block sm:hidden w-full overflow-x-auto pb-4 custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="mobile-order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="w-16">Qty</th>
                  <th className="w-24">Price</th>
                  <th className="w-20">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="bg-white dark:bg-slate-950">
                    <td>
                      <div 
                        onClick={() => openProductGrid(idx)}
                        className={cn(
                          "flex items-center gap-2 rounded border border-input bg-slate-50/50 dark:bg-slate-900 px-2 py-1.5 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-[140px] max-w-[180px]",
                          !item.product_name && "border-dashed border-slate-300 dark:border-slate-700"
                        )}
                        role="button"
                        tabIndex={0}
                      >
                        {item.product_name ? (
                          <>
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-5 h-5 rounded object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                                <ImageIcon className="w-3 h-3 text-slate-500" />
                              </div>
                            )}
                            <span className="truncate font-medium">{item.product_name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
                            <span className="truncate">Select...</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)} 
                        className="h-8 px-2 text-center text-xs font-medium w-full min-w-[60px]"
                      />
                    </td>
                    <td>
                      <Input 
                        type="number" 
                        value={item.unit_price} 
                        onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} 
                        className="h-8 px-2 text-right text-xs font-mono w-full min-w-[80px]"
                      />
                    </td>
                    <td className="text-right text-xs font-mono font-semibold text-primary">
                      {formatCurrency(item.line_total)}
                    </td>
                    <td className="text-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" 
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end mt-4 sm:mt-6">
            <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800/80 py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-sm">Order Total:</span>
              <span className="text-xl sm:text-2xl font-bold text-primary tracking-tight">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Label>Notes (Optional)</Label>
          <Textarea 
            placeholder="Any special instructions or notes..." 
            value={formData.notes} 
            onChange={e => setFormData({...formData, notes: e.target.value})}
            rows={3}
            className="resize-none bg-white dark:bg-slate-950"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="book-order-form" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? (
              <span className="animate-pulse flex items-center">
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                Saving...
              </span>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Order</>
            )}
          </Button>
        </div>
      </form>

      <ProductGridModal 
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        products={products}
        onSelectProduct={handleProductSelectFromGrid}
        selectedProductId={activeRowIndex !== null ? items[activeRowIndex]?.product_id : null}
      />
    </div>
  );
};

export default BookOrderForm;