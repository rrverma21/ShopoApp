import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, MapPin, Search } from 'lucide-react';

const DeliveryAreas = () => {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ pincode: '', city: '', state: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPincodes();
  }, []);

  const fetchPincodes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('delivery_areas').select('*').order('pincode');
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setPincodes(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const payload = {
      pincode: formData.pincode.trim(),
      city: formData.city.trim(),
      state: formData.state.trim()
    };

    if (!payload.pincode || !payload.city) {
        toast({ title: 'Error', description: 'Pincode and City are required.', variant: 'destructive' });
        return;
    }

    let error;
    if (editingId) {
      ({ error } = await supabase.from('delivery_areas').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('delivery_areas').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Pincode ${editingId ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      fetchPincodes();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this pincode from the master list?')) return;
    const { error } = await supabase.from('delivery_areas').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Deleted', description: 'Pincode removed.' });
      fetchPincodes();
    }
  };

  const openDialog = (item = null) => {
    setEditingId(item ? item.id : null);
    setFormData(item ? { pincode: item.pincode, city: item.city, state: item.state || '' } : { pincode: '', city: '', state: '' });
    setIsDialogOpen(true);
  };

  const filteredPincodes = pincodes.filter(p => 
    p.pincode.includes(searchTerm) || 
    p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.state && p.state.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Pincode Configuration</h1>
          <p className="text-slate-600">Manage serviceable pincodes for the platform.</p>
        </div>
        <Button onClick={() => openDialog()}><Plus className="w-4 h-4 mr-2" /> Add Pincode</Button>
      </div>

      <Card>
        <div className="p-4 border-b">
            <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search pincode or city..." 
                    className="pl-8" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pincode</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24">Loading...</TableCell></TableRow>
              ) : filteredPincodes.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No pincodes defined.</TableCell></TableRow>
              ) : (
                filteredPincodes.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-medium">{item.pincode}</TableCell>
                    <TableCell>{item.city}</TableCell>
                    <TableCell>{item.state || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(item)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Pincode' : 'Add New Pincode'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input 
                value={formData.pincode} 
                onChange={e => setFormData({ ...formData, pincode: e.target.value })} 
                placeholder="e.g. 110001" 
                maxLength={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryAreas;