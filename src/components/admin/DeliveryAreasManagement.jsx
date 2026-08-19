import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, MapPin } from "lucide-react"; // Added MapPin icon
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Helmet } from 'react-helmet-async'; // Import Helmet

const DeliveryAreasManagement = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', delivery_charge: '', is_active: true });
  const { toast } = useToast();

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('water_delivery_areas')
        .select('*')
        .order('name', { ascending: true }); // Order by name for better display

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery areas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = async () => {
    if (!newArea.name) {
      toast({
        title: "Validation Error",
        description: "Area Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = { ...newArea, delivery_charge: newArea.delivery_charge ? parseFloat(newArea.delivery_charge) : 0 };
      const { error } = await supabase
        .from('water_delivery_areas')
        .insert([payload]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery area added successfully",
      });
      setIsAddDialogOpen(false);
      setNewArea({ name: '', delivery_charge: '', is_active: true });
      fetchAreas();
    } catch (error) {
      console.error('Error adding area:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate key') ? "Failed to add delivery area. An area with this name already exists." : "Failed to add delivery area.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteArea = async (id) => {
    if (!confirm('Are you sure you want to delete this area? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('water_delivery_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery area deleted successfully",
      });
      fetchAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
      toast({
        title: "Error",
        description: "Failed to delete delivery area. It may be linked to existing orders or other data.",
        variant: "destructive",
      });
    }
  };

  const toggleAreaStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('water_delivery_areas')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setAreas(areas.map(area => 
        area.id === id ? { ...area, is_active: !currentStatus } : area
      ));
      
      toast({
        title: "Success",
        description: "Area status updated",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8 bg-slate-50 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <Helmet>
        <title>Delivery Areas Management - Admin</title>
        <meta name="description" content="Manage delivery areas and charges for the water delivery service." />
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <MapPin className="w-6 h-6 text-blue-500" /> 
            Water Delivery Areas
          </h1>
          <p className="text-slate-500 mt-1">Manage service areas and delivery charges for water delivery</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Add New Area
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Delivery Area</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Area Name *</Label>
                <Input 
                  id="name" 
                  value={newArea.name} 
                  onChange={(e) => setNewArea({...newArea, name: e.target.value})}
                  placeholder="e.g. Koramangala"
                  className="text-slate-900 border-slate-300 focus:border-blue-500"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="delivery_charge">Delivery Charge (₹)</Label>
                <Input 
                  id="delivery_charge" 
                  type="number"
                  value={newArea.delivery_charge} 
                  onChange={(e) => setNewArea({...newArea, delivery_charge: e.target.value})}
                  placeholder="0"
                  step="0.01"
                  className="text-slate-900 border-slate-300 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_active" 
                  checked={newArea.is_active}
                  onCheckedChange={(checked) => setNewArea({...newArea, is_active: checked})}
                />
                <Label htmlFor="is_active" className="text-slate-700">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddArea}>Add Area</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area Name</TableHead>
              <TableHead>Delivery Charge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No delivery areas found
                </TableCell>
              </TableRow>
            ) : (
              areas.map((area) => (
                <TableRow key={area.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-800">{area.name}</TableCell>
                  <TableCell>₹{area.delivery_charge}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={area.is_active}
                      onCheckedChange={() => toggleAreaStatus(area.id, area.is_active)}
                    />
                    <span className="ml-2 text-sm text-slate-600">{area.is_active ? 'Active' : 'Inactive'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteArea(area.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DeliveryAreasManagement;