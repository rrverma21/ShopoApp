import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Edit, Trash2, MapPin, Filter, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import WaterDeliveryAreaForm from './WaterDeliveryAreaForm';

const WaterDeliveryAreasManagement = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState(null);
  
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching water delivery areas:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery areas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedArea(null);
    setIsFormOpen(true);
  };

  const handleEdit = (area) => {
    setSelectedArea(area);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (area) => {
    setAreaToDelete(area);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!areaToDelete) return;

    try {
      const { error } = await supabase
        .from('water_delivery_areas')
        .delete()
        .eq('id', areaToDelete.id);

      if (error) throw error;

      setAreas(areas.filter(a => a.id !== areaToDelete.id));
      toast({
        title: "Success",
        description: "Delivery area deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting area:', error);
      toast({
        title: "Error",
        description: "Failed to delete area.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setAreaToDelete(null);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedArea) {
        // Update existing area
        const { data, error } = await supabase
          .from('water_delivery_areas')
          .update({
            name: formData.name,
            description: formData.description,
            delivery_charge: formData.delivery_charge,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedArea.id)
          .select()
          .single();

        if (error) throw error;

        setAreas(areas.map(a => a.id === selectedArea.id ? data : a));
        toast({
          title: "Success",
          description: "Delivery area updated successfully.",
        });
      } else {
        // Create new area
        const { data, error } = await supabase
          .from('water_delivery_areas')
          .insert([{
            name: formData.name,
            description: formData.description,
            delivery_charge: formData.delivery_charge,
            is_active: formData.is_active
          }])
          .select()
          .single();

        if (error) throw error;

        setAreas([data, ...areas]);
        toast({
          title: "Success",
          description: "New delivery area created successfully.",
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving area:', error);
      toast({
        title: "Error",
        description: "Failed to save area. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Filter areas based on search and status
  const filteredAreas = areas.filter(area => {
    const matchesSearch = 
      area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (area.description && area.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && area.is_active) ||
      (statusFilter === 'inactive' && !area.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            Water Delivery Areas
          </h1>
          <p className="text-slate-500 mt-1">
            Manage delivery zones and pricing for water supply service.
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
          <Plus className="h-4 w-4 mr-2" />
          Create New Area
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="rounded-xl shadow-sm border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search areas by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span>{statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas Table/List */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500">Loading delivery areas...</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <MapPin className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No areas found</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your search or filters to find what you're looking for." 
                : "Get started by adding your first delivery area."}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[30%]">Area Name</TableHead>
                  <TableHead className="w-[30%] hidden md:table-cell">Description</TableHead>
                  <TableHead>Delivery Charge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.map((area) => (
                  <TableRow key={area.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-semibold">{area.name}</span>
                        <span className="md:hidden text-xs text-slate-500 truncate max-w-[150px]">{area.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600">
                      <div className="truncate max-w-xs" title={area.description}>
                        {area.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      ₹{parseFloat(area.delivery_charge).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {area.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                      {area.created_at ? format(new Date(area.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(area)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(area)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedArea ? 'Edit Delivery Area' : 'Create New Delivery Area'}</DialogTitle>
          </DialogHeader>
          <WaterDeliveryAreaForm 
            area={selectedArea} 
            onSave={handleSave} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the area
              <span className="font-semibold text-slate-900"> "{areaToDelete?.name}" </span>
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Area
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WaterDeliveryAreasManagement;