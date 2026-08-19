import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Edit, Trash2, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const VacancyForm = ({ vacancy, onFormSubmit }) => {
  const [formData, setFormData] = useState({
    title: vacancy?.title || '',
    description: vacancy?.description || '',
    location: vacancy?.location || '',
    is_active: vacancy?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (vacancy) {
        ({ error } = await supabase.from('vacancies').update(formData).eq('id', vacancy.id));
      } else {
        ({ error } = await supabase.from('vacancies').insert(formData));
      }
      if (error) throw error;
      toast({
        title: vacancy ? 'Vacancy Updated!' : 'Vacancy Created!',
        description: `The vacancy "${formData.title}" has been successfully saved.`,
      });
      onFormSubmit();
    } catch (error) {
      toast({
        title: 'Operation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Job Title</Label>
        <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Remote or City, Country" />
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
        <Label htmlFor="is_active">Active (Visible to candidates)</Label>
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Vacancy'}</Button>
      </div>
    </form>
  );
};

const VacancyManagement = () => {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vacancies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVacancies(data);
    } catch (error) {
      toast({
        title: 'Error fetching vacancies',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('vacancies').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Vacancy Deleted', description: 'The vacancy has been removed.' });
      fetchVacancies();
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Vacancy Management</h1>
          <p className="text-slate-600 text-base md:text-lg">Create and manage job openings.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Vacancy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vacancy</DialogTitle>
              <DialogDescription>Fill in the details for the new job opening.</DialogDescription>
            </DialogHeader>
            <VacancyForm onFormSubmit={() => { setIsFormOpen(false); fetchVacancies(); }} />
          </DialogContent>
        </Dialog>
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : vacancies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vacancies.map((vacancy, index) => (
            <motion.div key={vacancy.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="glass-effect h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    {vacancy.title}
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${vacancy.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {vacancy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </CardTitle>
                  <CardDescription>{vacancy.location || 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-slate-600 text-sm">{vacancy.description}</p>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Vacancy</DialogTitle>
                        <DialogDescription>Update the details for this job opening.</DialogDescription>
                      </DialogHeader>
                      <VacancyForm vacancy={vacancy} onFormSubmit={fetchVacancies} />
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex-1">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the vacancy. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(vacancy.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Briefcase className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-semibold">No vacancies posted yet.</p>
          <p>Click "Add Vacancy" to create your first job opening.</p>
        </div>
      )}
    </div>
  );
};

export default VacancyManagement;