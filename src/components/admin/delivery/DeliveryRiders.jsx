import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Search, Bike, Edit } from 'lucide-react';

const DeliveryRiders = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [pincodesInput, setPincodesInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch riders profiles and details
    // Fixed: Changed full_name to contact_person to match database schema
    const { data: riderProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, contact_person, phone, is_disabled')
      .eq('role', 'rider');
      
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      toast({ title: 'Error', description: 'Failed to fetch rider profiles', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: riderDetails, error: detailsError } = await supabase.from('delivery_rider_details').select('*');
    
    if (detailsError) {
       console.error('Error fetching details:', detailsError);
    }

    const combined = riderProfiles?.map(rider => {
        const detail = riderDetails?.find(d => d.rider_id === rider.id);
        return {
            ...rider,
            serviceable_pincodes: detail?.serviceable_pincodes || [],
            is_available: detail?.is_available || false,
            vehicle_type: detail?.vehicle_type || 'Unknown'
        };
    }) || [];

    setRiders(combined);
    setLoading(false);
  };

  const openEditDialog = (rider) => {
    setEditingRider(rider);
    setPincodesInput(rider.serviceable_pincodes?.join(', ') || '');
    setIsDialogOpen(true);
  };

  const handleSavePincodes = async () => {
    const codesArray = pincodesInput
        .split(',')
        .map(code => code.trim())
        .filter(code => code.length > 0 && /^\d+$/.test(code)); 

    const { error } = await supabase.from('delivery_rider_details').upsert({
        rider_id: editingRider.id,
        serviceable_pincodes: codesArray
    }, { onConflict: 'rider_id' });

    if(error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } else {
        setRiders(prev => prev.map(r => r.id === editingRider.id ? { ...r, serviceable_pincodes: codesArray } : r));
        toast({ title: 'Updated', description: 'Rider coverage updated.' });
        setIsDialogOpen(false);
    }
  };

  const filteredRiders = riders.filter(r => 
    r.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.phone?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Rider Pincode Assignment</h1>
        <p className="text-slate-600">Assign operational pincodes to riders.</p>
      </div>

      <Card>
        <CardHeader>
            <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search riders..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Rider Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Serviceable Pincodes</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
                    ) : filteredRiders.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No riders found.</TableCell></TableRow>
                    ) : (
                        filteredRiders.map(rider => (
                            <TableRow key={rider.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Bike className="w-4 h-4 text-slate-400" /> {rider.contact_person || 'Unnamed'}
                                </TableCell>
                                <TableCell>{rider.phone}</TableCell>
                                <TableCell className="max-w-md">
                                    {rider.serviceable_pincodes?.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {rider.serviceable_pincodes.slice(0, 5).map(code => (
                                                <span key={code} className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-mono">
                                                    {code}
                                                </span>
                                            ))}
                                            {rider.serviceable_pincodes.length > 5 && (
                                                <span className="text-xs text-slate-400 py-0.5">+{rider.serviceable_pincodes.length - 5} more</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-sm italic">No pincodes assigned</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge className={rider.is_available ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}>
                                        {rider.is_available ? 'Online' : 'Offline'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={rider.is_disabled ? "destructive" : "outline"}>
                                        {rider.is_disabled ? 'Disabled' : 'Active'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(rider)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
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
            <DialogHeader>
                <DialogTitle>Edit Pincodes for {editingRider?.contact_person}</DialogTitle>
                <DialogDescription>Enter comma-separated pincodes this rider can serve.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label className="mb-2 block">Serviceable Pincodes</Label>
                <Textarea 
                    value={pincodesInput}
                    onChange={(e) => setPincodesInput(e.target.value)}
                    placeholder="110001, 110002..."
                    className="h-32 font-mono text-sm"
                />
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

export default DeliveryRiders;