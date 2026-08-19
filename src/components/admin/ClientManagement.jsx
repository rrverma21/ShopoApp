import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserPlus as UserUp, Search, Trash2, ShieldCheck, ShieldAlert, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.profile?.role === 'admin';

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_clients');

      if (error) throw error;
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_id, phone_verified')
        .in('id', data.map(c => c.id));

      if (profileError) throw profileError;

      const clientsWithDetails = data.map(client => {
        const profile = profiles.find(p => p.id === client.id);
        return { ...client, ...profile };
      });

      setClients(clientsWithDetails);
    } catch (error) {
      toast({ title: "Error fetching clients", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setFilteredClients(
      clients.filter(c =>
        (c.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.display_id || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, clients]);
  
  const handleRoleChange = async (userId, newRole, userName) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role Updated!",
        description: `${userName} is now a ${newRole}.`,
      });
      fetchClients();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard.` });
  };

  if (loading) {
    return <div className="p-4 md:p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }
  
  return (
    <>
      <div className="p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Client Management</h1>
              <p className="text-slate-600 text-base md:text-lg">View and manage registered client accounts.</p>
            </div>
        </motion.div>
        
        <Card className="glass-effect mb-6 p-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search by business name or customer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client, index) => (
            <motion.div key={client.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="glass-effect">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{client.business_name}</CardTitle>
                    {client.phone_verified ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                        <ShieldCheck className="h-4 w-4" /> Verified
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-600 text-xs font-semibold">
                        <ShieldAlert className="h-4 w-4" /> Unverified
                      </div>
                    )}
                  </div>
                  <CardDescription>{client.contact_person}</CardDescription>
                </CardHeader>
                <CardContent>
                  {client.display_id && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <span>ID: {client.display_id}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(client.display_id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-slate-600">{client.phone}</p>
                  <p className="text-slate-500 text-sm mt-1">{client.city}, {client.pincode}</p>
                   <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                     {isAdmin && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <UserUp className="h-4 w-4 mr-2" />
                            Promote to Salesman
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will promote {client.business_name} to a salesman. They will gain access to salesman-specific features.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRoleChange(client.id, 'salesman', client.business_name)}>
                              Confirm Promotion
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                     )}

                    <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => toast({ title: "🚧 Feature not implemented", description: "Deleting users is coming soon!" })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                   </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
           {filteredClients.length === 0 && (
            <div className="text-center py-16 text-slate-500 col-span-full">
              <p>No clients found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientManagement;