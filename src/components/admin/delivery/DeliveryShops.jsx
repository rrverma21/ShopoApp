import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Search, Store, Edit } from 'lucide-react';

const DeliveryShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [pincodesInput, setPincodesInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Get all sellers
    const { data: sellers } = await supabase.from('profiles').select('id, business_name, phone, city').eq('role', 'seller');
    
    // 2. Get delivery settings
    const { data: settings } = await supabase.from('delivery_shops').select('*');
    
    const combined = sellers.map(seller => {
        const setting = settings?.find(s => s.seller_id === seller.id);
        return {
            ...seller,
            serviceable_pincodes: setting?.serviceable_pincodes || [],
            is_active_for_delivery: setting?.is_active_for_delivery ?? true
        };
    });
    
    setShops(combined);
    setLoading(false);
  };

  const openEditDialog = (shop) => {
    setEditingShop(shop);
    setPincodesInput(shop.serviceable_pincodes?.join(', ') || '');
    setIsDialogOpen(true);
  };

  const handleSavePincodes = async () => {
    const codesArray = pincodesInput
        .split(',')
        .map(code => code.trim())
        .filter(code => code.length > 0 && /^\d+$/.test(code)); // Simple validation for digits

    const { error } = await supabase.from('delivery_shops').upsert({
        seller_id: editingShop.id,
        serviceable_pincodes: codesArray
    }, { onConflict: 'seller_id' });

    if(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } else {
        setShops(prev => prev.map(s => s.id === editingShop.id ? { ...s, serviceable_pincodes: codesArray } : s));
        toast({ title: 'Updated', description: 'Shop serviceable pincodes updated.' });
        setIsDialogOpen(false);
    }
  };

  const toggleActive = async (shopId, currentStatus) => {
    const { error } = await supabase.from('delivery_shops').upsert({
        seller_id: shopId,
        is_active_for_delivery: !currentStatus
    }, { onConflict: 'seller_id' });

    if(error) toast({ title: 'Error', description: error.message, variant: 'destructive'});
    else {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, is_active_for_delivery: !currentStatus } : s));
    }
  };

  const filteredShops = shops.filter(s => 
    s.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Shop Delivery Settings</h1>
        <p className="text-slate-600">Assign serviceable pincodes to shops.</p>
      </div>

      <Card>
        <CardHeader>
            <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search shops..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Serviceable Pincodes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredShops.map(shop => (
                        <TableRow key={shop.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                                <Store className="w-4 h-4 text-slate-400" /> {shop.business_name}
                            </TableCell>
                            <TableCell>{shop.city}</TableCell>
                            <TableCell className="max-w-md">
                                {shop.serviceable_pincodes?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {shop.serviceable_pincodes.slice(0, 5).map(code => (
                                            <span key={code} className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-mono">
                                                {code}
                                            </span>
                                        ))}
                                        {shop.serviceable_pincodes.length > 5 && (
                                            <span className="text-xs text-slate-400 py-0.5">+{shop.serviceable_pincodes.length - 5} more</span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 text-sm italic">No pincodes assigned</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Button 
                                    size="sm" 
                                    variant={shop.is_active_for_delivery ? "outline" : "destructive"}
                                    className={`h-7 text-xs ${shop.is_active_for_delivery ? 'text-green-600 border-green-200 bg-green-50' : ''}`}
                                    onClick={() => toggleActive(shop.id, shop.is_active_for_delivery)}
                                >
                                    {shop.is_active_for_delivery ? 'Active' : 'Inactive'}
                                </Button>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(shop)}>
                                    <Edit className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Pincodes for {editingShop?.business_name}</DialogTitle>
                <DialogDescription>Enter comma-separated pincodes this shop delivers to.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label className="mb-2 block">Serviceable Pincodes</Label>
                <Textarea 
                    value={pincodesInput}
                    onChange={(e) => setPincodesInput(e.target.value)}
                    placeholder="110001, 110002, 110003..."
                    className="h-32 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">Only numeric values allowed.</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSavePincodes}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryShops;