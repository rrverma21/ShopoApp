import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Mail, Phone, Calendar, FileText, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDateToDDMMYYYY } from '@/lib/utils';

const ApplicationManagement = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, vacancy:vacancies(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setApplications(data);
    } catch (error) {
      toast({
        title: 'Error fetching applications',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = async (id, status) => {
    try {
      const { error } = await supabase.from('job_applications').update({ status }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Status Updated', description: `Application status changed to ${status}.` });
      fetchApplications();
    } catch (error) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('job_applications').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Application Deleted' });
      fetchApplications();
    } catch (error) {
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleDownloadResume = async (resumePath) => {
    try {
      const path = resumePath.includes('/') ? resumePath.split('/').pop() : resumePath;
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(path, 60); // URL valid for 60 seconds

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Could not create a secure link to download the resume. ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'In Review': return 'bg-yellow-100 text-yellow-800';
      case 'Interviewing': return 'bg-purple-100 text-purple-800';
      case 'Offered': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Application Management</h1>
        <p className="text-slate-600 text-base md:text-lg">Review and manage job applications.</p>
      </motion.div>

      {applications.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-semibold">No applications received yet.</p>
        </div>
      ) : (
        <Card className="glass-effect">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.name}</div>
                      <div className="text-sm text-muted-foreground">{app.email}</div>
                      {app.phone && <div className="text-sm text-muted-foreground">{app.phone}</div>}
                    </TableCell>
                    <TableCell>{app.vacancy?.title || 'N/A'}</TableCell>
                    <TableCell>{formatDateToDDMMYYYY(app.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className={`h-auto p-1 px-2 text-xs ${getStatusColor(app.status)}`}>
                            {app.status} <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {['Submitted', 'In Review', 'Interviewing', 'Offered', 'Rejected'].map(status => (
                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(app.id, status)}>
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" className="mr-2" onClick={() => handleDownloadResume(app.resume_url)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the application from {app.name}.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(app.id)}>Delete</AlertDialogAction>
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
      )}
    </div>
  );
};

export default ApplicationManagement;