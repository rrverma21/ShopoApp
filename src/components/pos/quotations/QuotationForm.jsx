import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CustomerSearchDropdown } from './CustomerSearchDropdown';
import { ProductSearchDropdown } from './ProductSearchDropdown';

const QuotationForm = ({ initialData, onSubmit, loading, isReadOnly = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [validationError, setValidationError] = useState('');
  
  const [formData, setFormData] = useState({
    customer_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    notes: '',
    discount_type: 'none',
    discount_value: 0,
    ...initialData
  });

  const [items, setItems] = useState(initialData?.quotation_items || []);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ 
        ...prev, 
        ...initialData,
        discount_type: initialData.discount_type || 'none',
        discount_value: initialData.discount_value || 0
      }));
      setItems(initialData.quotation_items || []);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch Customers
        const custRes = await supabase
          .from('point_of_sale_customers')
          .select('id, name, phone, gstin')
          .eq('user_id', user.id)
          .order('name')
          .limit(10000);
          
        if (custRes.error) console.error("Error fetching customers:", custRes.error);
        if (custRes.data) setCustomers(custRes.data);

        // Fetch Products with Pagination
        let allProducts = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('point_of_sale_products')
            .select('id, name, sku, selling_price, tax_rate, hsn_code, stock_level, category')
            .eq('user_id', user.id)
            .eq('archived', false)
            .order('name')
            .range(offset, offset + limit - 1);

          if (error) {
            console.error("Error fetching products batch:", error);
            break;
          }

          if (data && data.length > 0) {
            allProducts = [...allProducts, ...data];
            if (data.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          } else {
            hasMore = false;
          }
        }

        // Deduplicate products by ID
        const uniqueProductsMap = new Map();
        allProducts.forEach(p => {
          if (!uniqueProductsMap.has(p.id)) {
            uniqueProductsMap.set(p.id, p);
          }
        });
        const uniqueProducts = Array.from(uniqueProductsMap.values());

        // Sort alphabetically by name
        uniqueProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        console.log(`Successfully fetched ${uniqueProducts.length} unique products for quotations.`);
        setProducts(uniqueProducts);

      } catch (error) {
        console.error("Unexpected error fetching quotation form data:", error);
      }
    };
    fetchData();
  }, [user]);

  const calculateItem = (item) => {
    const qty = Number(item.quantity) || 0;
    const rateInclusive = Number(item.rate) || 0; // Rate is GST-inclusive
    const sgstPct = Number(item.sgst_percentage) || 0;
    const cgstPct = Number(item.cgst_percentage) || 0;
    const totalTaxPct = sgstPct + cgstPct;

    // Extract taxable amount from inclusive rate
    const unitTaxable = rateInclusive / (1 + (totalTaxPct / 100));
    const taxable = unitTaxable * qty;
    
    // Calculate taxes based on extracted taxable amount
    const sgstAmt = unitTaxable * (sgstPct / 100) * qty;
    const cgstAmt = unitTaxable * (cgstPct / 100) * qty;
    
    // Line total is simply rate * qty
    const itemTotal = rateInclusive * qty;
    
    return {
      ...item,
      taxable_amount: taxable,
      sgst_amount: sgstAmt,
      cgst_amount: cgstAmt,
      item_total: itemTotal
    };
  };

  const handleAddItem = () => {
    setItems([...items, {
      product_id: '', product_name: '', hsn_code: '', quantity: 1, rate: 0, 
      taxable_amount: 0, sgst_percentage: 0, sgst_amount: 0, cgst_percentage: 0, cgst_amount: 0, item_total: 0
    }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    let item = newItems[index];

    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        const taxHalf = (prod.tax_rate || 0) / 2;
        item = {
          ...item,
          product_id: prod.id,
          product_name: prod.name,
          hsn_code: prod.hsn_code || '',
          rate: prod.selling_price,
          sgst_percentage: taxHalf,
          cgst_percentage: taxHalf
        };
      }
    } else {
      item[field] = value;
    }

    newItems[index] = calculateItem(item);
    setItems(newItems);
  };

  const calculateTotals = () => {
    const baseTotals = items.reduce((acc, item) => ({
      subtotal: acc.subtotal + (Number(item.taxable_amount) || 0),
      sgst: acc.sgst + (Number(item.sgst_amount) || 0),
      cgst: acc.cgst + (Number(item.cgst_amount) || 0),
      originalGrand: acc.originalGrand + (Number(item.item_total) || 0)
    }), { subtotal: 0, sgst: 0, cgst: 0, originalGrand: 0 });

    let discountAmount = 0;
    const discountValue = Number(formData.discount_value) || 0;

    // 1. Calculate Discount Amount based on Subtotal (Taxable)
    if (formData.discount_type === 'flat') {
      discountAmount = discountValue;
    } else if (formData.discount_type === 'percentage') {
      discountAmount = baseTotals.subtotal * (discountValue / 100);
    }

    // Prevent discount from exceeding subtotal
    discountAmount = Math.min(discountAmount, baseTotals.subtotal);

    // 2. Calculate Discounted Subtotal
    const discountedSubtotal = baseTotals.subtotal - discountAmount;
    
    // Calculate proportional reduction for taxes to handle mixed tax rates correctly
    const discountFactor = baseTotals.subtotal > 0 ? (discountedSubtotal / baseTotals.subtotal) : 1;

    // 3 & 4. Calculate GST Components on discounted amounts
    const finalSgst = baseTotals.sgst * discountFactor;
    const finalCgst = baseTotals.cgst * discountFactor;
    
    // 5. Calculate Grand Total
    const grandTotal = discountedSubtotal + finalSgst + finalCgst;

    return {
      subtotal: baseTotals.subtotal,
      sgst: finalSgst,
      cgst: finalCgst,
      discountAmount,
      discountedSubtotal,
      grand: grandTotal,
      finalTotal: grandTotal // Final total is the same as grand total
    };
  };

  const totals = calculateTotals();

  // Validation
  useEffect(() => {
    setValidationError('');
    const discountValue = Number(formData.discount_value) || 0;
    
    if (formData.discount_type === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      setValidationError('Percentage must be between 0 and 100');
    } else if (formData.discount_type === 'flat' && discountValue > totals.subtotal) {
      setValidationError('Flat discount cannot exceed subtotal (taxable amount)');
    } else if (discountValue < 0) {
      setValidationError('Discount cannot be negative');
    }
  }, [formData.discount_type, formData.discount_value, totals.subtotal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validationError) return;
    
    onSubmit({
      customer_id: formData.customer_id,
      quotation_date: formData.quotation_date,
      status: formData.status,
      notes: formData.notes,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      quotation_items: items,
      subtotal: totals.subtotal,
      sgst_total: totals.sgst,
      cgst_total: totals.cgst,
      grand_total: totals.grand,
      discount_amount: totals.discountAmount,
      final_total: totals.finalTotal
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <CustomerSearchDropdown
                customers={customers}
                value={formData.customer_id}
                onChange={(v) => setFormData({...formData, customer_id: v})}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" disabled={isReadOnly} value={formData.quotation_date} onChange={(e) => setFormData({...formData, quotation_date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select disabled={isReadOnly} value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-3">Product/Item</th>
                <th className="p-3 w-24">HSN</th>
                <th className="p-3 w-24">Qty</th>
                <th className="p-3 w-32">Rate (Inc. GST)</th>
                <th className="p-3 w-32">Taxable</th>
                <th className="p-3 w-24">SGST %</th>
                <th className="p-3 w-24">CGST %</th>
                <th className="p-3 w-32 text-right">Total</th>
                {!isReadOnly && <th className="p-3 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-2">
                    {isReadOnly ? item.product_name : (
                      <ProductSearchDropdown
                        products={products}
                        value={item.product_id}
                        onChange={(v) => handleItemChange(index, 'product_id', v)}
                        disabled={isReadOnly}
                      />
                    )}
                  </td>
                  <td className="p-2">
                    <Input disabled={isReadOnly} value={item.hsn_code} onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input disabled={isReadOnly} type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input disabled={isReadOnly} type="number" step="0.01" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input disabled value={item.taxable_amount.toFixed(2)} className="bg-slate-50 dark:bg-slate-900" />
                  </td>
                  <td className="p-2">
                    <Input disabled={isReadOnly} type="number" step="0.01" value={item.sgst_percentage} onChange={(e) => handleItemChange(index, 'sgst_percentage', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input disabled={isReadOnly} type="number" step="0.01" value={item.cgst_percentage} onChange={(e) => handleItemChange(index, 'cgst_percentage', e.target.value)} />
                  </td>
                  <td className="p-2 text-right font-medium">
                    {formatPrice(item.item_total)}
                  </td>
                  {!isReadOnly && (
                    <td className="p-2 text-center">
                      <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isReadOnly && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={handleAddItem} className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Discount</Label>
              <div className="flex gap-2">
                <Select disabled={isReadOnly} value={formData.discount_type} onValueChange={(v) => setFormData({...formData, discount_type: v, discount_value: 0})}>
                  <SelectTrigger className="w-1/2">
                    <SelectValue placeholder="Discount Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  disabled={isReadOnly || formData.discount_type === 'none'} 
                  value={formData.discount_value} 
                  onChange={(e) => setFormData({...formData, discount_value: e.target.value})} 
                  placeholder="Amount"
                  className="w-1/2"
                />
              </div>
              {validationError && <p className="text-sm text-red-500 mt-1">{validationError}</p>}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label>Notes / Terms & Conditions</Label>
              <Textarea disabled={isReadOnly} rows={4} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Enter any notes or terms..." className="resize-none" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl h-full flex flex-col justify-center">
            <div className="space-y-3">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal (Taxable)</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              
              {formData.discount_type !== 'none' && (
                <div className="flex justify-between text-red-500 font-medium">
                  <span>Discount ({formData.discount_type === 'percentage' ? `${formData.discount_value}%` : 'Flat'})</span>
                  <span>-{formatPrice(totals.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>SGST Total</span>
                <span>{formatPrice(totals.sgst)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>CGST Total</span>
                <span>{formatPrice(totals.cgst)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-semibold">
                <span>Grand Total</span>
                <span>{formatPrice(totals.grand)}</span>
              </div>
              
              <div className="pt-3 border-t-2 border-slate-300 dark:border-slate-600 flex justify-between font-bold text-xl text-primary">
                <span>Final Total</span>
                <span>{formatPrice(totals.finalTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/pos/quotations')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {!isReadOnly && (
          <Button type="submit" disabled={loading || !!validationError} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Quotation'}
          </Button>
        )}
      </div>
    </form>
  );
};

export default QuotationForm;