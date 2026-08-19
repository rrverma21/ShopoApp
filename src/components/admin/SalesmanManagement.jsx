import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { MonitorDown as UserDown, Search, Trash2, UserPlus, Store, ShieldCheck, ShieldAlert } from 'lucide-react';
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
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogTrigger,
      DialogFooter,
      DialogDescription,
    } from '@/components/ui/dialog';
    import { Label } from '@/components/ui/label';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/supabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const SalesmanManagement = () => {
      const { user } = useAuth();
      const { toast } = useToast();
      const [salesmen, setSalesmen] = useState([]);
      const [filteredSalesmen, setFilteredSalesmen] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');
      const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
      const [newSalesman, setNewSalesman] = useState({
        email: '',
        password: '',
        businessName: '',
        phone: '',
      });

      const userRole = user?.profile?.role;
      const isAdmin = userRole === 'admin';
      const isSeller = userRole === 'seller';

      const fetchSalesmen = useCallback(async () => {
        try {
          setLoading(true);
          let query = supabase
            .from('profiles')
            .select('*, seller:seller_id(business_name)')
            .eq('role', 'salesman')
            .order('business_name', { ascending: true });

          if (isSeller) {
            query = query.eq('seller_id', user.id);
          }

          const { data, error } = await query;

          if (error) throw error;
          setSalesmen(data);
        } catch (error) {
          toast({ title: "Error fetching salesmen", description: error.message, variant: "destructive" });
        } finally {
          setLoading(false);
        }
      }, [toast, isSeller, user?.id]);

      useEffect(() => {
        fetchSalesmen();
      }, [fetchSalesmen]);

      useEffect(() => {
        setFilteredSalesmen(
          salesmen.filter(s =>
            s.business_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }, [searchTerm, salesmen]);

      const handleRoleChange = async (userId, newRole, userName) => {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole, seller_id: null })
          .eq('id', userId);

        if (error) {
          toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Role Updated!", description: `${userName} is now a ${newRole}.` });
          fetchSalesmen();
        }
      };

      const handleAddSalesmanChange = (e) => {
        setNewSalesman({ ...newSalesman, [e.target.id]: e.target.value });
      };

      const handleAddSalesman = async () => {
        if (!newSalesman.email || !newSalesman.password || !newSalesman.businessName || !newSalesman.phone) {
          toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: newSalesman.email,
          password: newSalesman.password,
          options: {
            data: {
              businessName: newSalesman.businessName,
              contactPerson: newSalesman.businessName,
              phone: newSalesman.phone,
              role: 'salesman',
            },
          },
        });

        if (signUpError) {
          toast({ title: "Failed to create salesman", description: signUpError.message, variant: "destructive" });
          return;
        }

        if (signUpData.user) {
          if (isSeller) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ seller_id: user.id })
              .eq('id', signUpData.user.id);

            if (profileError) {
              toast({ title: "Failed to assign salesman", description: profileError.message, variant: "destructive" });
              return;
            }
          }
          
          toast({ title: "Salesman Created!", description: `${newSalesman.businessName} has been added. They need to verify their email.` });
          setIsAddDialogOpen(false);
          setNewSalesman({ email: '', password: '', businessName: '', phone: '' });
          fetchSalesmen();
        }
      };

      if (loading) {
        return <div className="p-4 md:p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
      }
      
      return (
        <>
          <div className="p-4 md:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Salesman Management</h1>
                  <p className="text-slate-600 text-base md:text-lg">Manage salesman accounts</p>
                </div>
                {(isAdmin || isSeller) && (
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full md:w-auto"><UserPlus className="mr-2 h-4 w-4" /> Add Salesman</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Salesman</DialogTitle>
                        <DialogDescription>Create a new salesman account. They will receive an email to confirm their account.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="businessName" className="text-right">Name</Label>
                          <Input id="businessName" value={newSalesman.businessName} onChange={handleAddSalesmanChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">Email</Label>
                          <Input id="email" type="email" value={newSalesman.email} onChange={handleAddSalesmanChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="password" className="text-right">Password</Label>
                          <Input id="password" type="password" value={newSalesman.password} onChange={handleAddSalesmanChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">Phone</Label>
                          <Input id="phone" value={newSalesman.phone} onChange={handleAddSalesmanChange} className="col-span-3" placeholder="+911234567890" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" onClick={handleAddSalesman}>Create Salesman</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
            </motion.div>
            
            <Card className="glass-effect mb-6 p-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSalesmen.map((salesman, index) => (
                <motion.div key={salesman.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="glass-effect">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{salesman.business_name}</CardTitle>
                        {salesman.phone_verified ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                            <ShieldCheck className="h-4 w-4" /> Verified
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-yellow-600 text-xs font-semibold">
                            <ShieldAlert className="h-4 w-4" /> Unverified
                          </div>
                        )}
                      </div>
                      <CardDescription>{salesman.phone}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isAdmin && (
                        <div className="mb-4 pt-4 border-t">
                          <p className="text-xs font-semibold text-slate-500 mb-1">ASSOCIATED SELLER</p>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-slate-500" />
                            <p className="font-medium text-blue-600">{salesman.seller?.business_name || 'Not Assigned'}</p>
                          </div>
                        </div>
                      )}
                       <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                         {isAdmin && (
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                <UserDown className="h-4 w-4 mr-2" />
                                Demote to Client
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will demote {salesman.business_name} to a client. They will lose access to salesman-specific features.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRoleChange(salesman.id, 'client', salesman.business_name)}>
                                  Confirm Demotion
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
               {filteredSalesmen.length === 0 && (
                <div className="text-center py-16 text-slate-500 col-span-full">
                  <p>No salesmen found.</p>
                </div>
              )}
            </div>
          </div>
        </>
      );
    };

    export default SalesmanManagement;