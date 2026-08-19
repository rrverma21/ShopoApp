import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const CategoryCreateModal = ({ open, onOpenChange, onCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      // Validate per-user uniqueness before insert
      const { data: existing, error: checkError } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', name.trim())
        .eq('seller_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        toast({
          title: "Validation Error",
          description: "A category with this name already exists in your account.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({ 
            name: name.trim(), 
            seller_id: user.id 
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Category created successfully." });
      setName('');
      onCreated?.(data);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Category Name</Label>
            <Input 
              id="cat-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Beverages"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || !name.trim()}
            className="bg-gradient-to-r from-[#2563EB] to-[#1e40af] hover:from-[#1e40af] hover:to-[#1e293b] text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border-none shadow-md shadow-blue-500/20"
          >
            {loading ? "Creating..." : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryCreateModal;