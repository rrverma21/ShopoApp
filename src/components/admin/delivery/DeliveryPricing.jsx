import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save } from 'lucide-react';

const DeliveryPricing = () => {
  const [config, setConfig] = useState({ base_fare: 40, base_distance_km: 2, per_km_rate: 15 });
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configId, setConfigId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch Config
    const { data: configData } = await supabase.from('delivery_pricing_config').select('*').single();
    if (configData) {
      setConfig({ base_fare: configData.base_fare, base_distance_km: configData.base_distance_km, per_km_rate: configData.per_km_rate });
      setConfigId(configData.id);
    }

    // Fetch Slabs
    const { data: slabsData } = await supabase.from('delivery_weight_slabs').select('*').order('min_weight');
    setSlabs(slabsData || []);
    setLoading(false);
  };

  const handleConfigSave = async () => {
    let error;
    if (configId) {
      ({ error } = await supabase.from('delivery_pricing_config').update(config).eq('id', configId));
    } else {
      ({ error } = await supabase.from('delivery_pricing_config').insert(config));
    }

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Saved', description: 'Base pricing updated.' });
  };

  const handleAddSlab = async () => {
    const newSlab = { min_weight: 0, max_weight: 0, surcharge: 0 };
    const { data, error } = await supabase.from('delivery_weight_slabs').insert(newSlab).select().single();
    if (!error) setSlabs([...slabs, data]);
  };

  const handleUpdateSlab = async (id, field, value) => {
    const updatedSlabs = slabs.map(s => s.id === id ? { ...s, [field]: value } : s);
    setSlabs(updatedSlabs);
    // Debounce save or save on blur in real app. Here we just update state, specific save button needed per row or global.
    // For simplicity, auto-save on blur logic is better, but let's add a save button for slabs section.
  };

  const handleSaveSlab = async (slab) => {
    const { error } = await supabase.from('delivery_weight_slabs').update({
        min_weight: slab.min_weight,
        max_weight: slab.max_weight,
        surcharge: slab.surcharge
    }).eq('id', slab.id);
    if(error) toast({ title: 'Error', description: error.message, variant: 'destructive'});
    else toast({ title: 'Saved', description: 'Slab updated.'});
  };

  const handleDeleteSlab = async (id) => {
    await supabase.from('delivery_weight_slabs').delete().eq('id', id);
    setSlabs(slabs.filter(s => s.id !== id));
  };

  if (loading) return <div className="p-8">Loading pricing...</div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Pricing Configuration</h1>
        <p className="text-slate-600">Configure delivery fares and weight surcharges.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base Pricing</CardTitle>
          <CardDescription>Default fare calculation logic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Base Fare (₹)</Label>
              <Input type="number" value={config.base_fare} onChange={e => setConfig({ ...config, base_fare: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Base Distance (km)</Label>
              <Input type="number" value={config.base_distance_km} onChange={e => setConfig({ ...config, base_distance_km: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Per KM Rate (₹)</Label>
              <Input type="number" value={config.per_km_rate} onChange={e => setConfig({ ...config, per_km_rate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleConfigSave}><Save className="w-4 h-4 mr-2" /> Save Configuration</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Weight Slabs</CardTitle>
            <CardDescription>Extra charges for heavy packages.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddSlab}><Plus className="w-4 h-4 mr-2"/> Add Slab</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Min Weight (kg)</TableHead>
                <TableHead>Max Weight (kg)</TableHead>
                <TableHead>Surcharge (₹)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slabs.map(slab => (
                <TableRow key={slab.id}>
                  <TableCell>
                    <Input 
                        type="number" 
                        value={slab.min_weight} 
                        onChange={e => handleUpdateSlab(slab.id, 'min_weight', e.target.value)} 
                        className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                        type="number" 
                        value={slab.max_weight} 
                        onChange={e => handleUpdateSlab(slab.id, 'max_weight', e.target.value)} 
                        className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                        type="number" 
                        value={slab.surcharge} 
                        onChange={e => handleUpdateSlab(slab.id, 'surcharge', e.target.value)} 
                        className="w-24 h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleSaveSlab(slab)}><Save className="w-4 h-4 text-green-600" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSlab(slab.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {slabs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No weight slabs defined.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryPricing;