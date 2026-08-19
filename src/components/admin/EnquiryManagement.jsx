import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Mail, User, Phone, MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { formatDateToDDMMYYYY } from '@/lib/utils';

const EnquiryManagement = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnquiries(data);
    } catch (error) {
      toast({
        title: 'Error fetching enquiries',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) throw error;
      toast({
        title: 'Enquiry Deleted',
        description: 'The enquiry has been successfully deleted.',
      });
      fetchEnquiries();
    } catch (error) {
      toast({
        title: 'Error deleting enquiry',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Enquiry Management</h1>
        <p className="text-slate-600 text-base md:text-lg">View and manage enquiries from the contact form.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {enquiries.length === 0 ? (
          <Card className="glass-effect">
            <CardContent className="text-center py-12 text-slate-500">
              <p className="text-lg font-semibold">No enquiries found.</p>
              <p>When a user submits the contact form, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden md:block">
              <Card className="glass-effect">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Received At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enquiries.map((enquiry) => (
                        <TableRow key={enquiry.id}>
                          <TableCell className="font-medium">{enquiry.name}</TableCell>
                          <TableCell>{enquiry.email}</TableCell>
                          <TableCell>{enquiry.phone || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">{enquiry.message}</TableCell>
                          <TableCell>{formatDateToDDMMYYYY(enquiry.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the enquiry.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(enquiry.id)} className="bg-red-600 hover:bg-red-700">
                                    Yes, delete it
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div className="md:hidden grid grid-cols-1 gap-4">
              {enquiries.map(enquiry => (
                <Card key={enquiry.id} className="glass-effect">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-slate-600" /> {enquiry.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-slate-500 flex-shrink-0" /> {enquiry.email}</p>
                    {enquiry.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /> {enquiry.phone}</p>}
                    <p className="flex items-start gap-2"><MessageSquare className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" /> {enquiry.message}</p>
                    <p className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t"><Calendar className="h-4 w-4" /> Received: {formatDateToDDMMYYYY(enquiry.created_at)}</p>
                  </CardContent>
                  <CardFooter className="pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the enquiry.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(enquiry.id)} className="bg-red-600 hover:bg-red-700">
                            Yes, delete it
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default EnquiryManagement;