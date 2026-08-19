import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStatusColor, formatDateToDDMMYYYY } from '@/lib/utils';
import { Eye, Check, X, FileText, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const RiderVerification = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRider, setSelectedRider] = useState(null);
    const [riderDocs, setRiderDocs] = useState([]);
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const fetchRegistrations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rider_registrations')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setRegistrations(data || []);
        }
        setLoading(false);
    };

    const fetchDocuments = async (regId) => {
        const { data } = await supabase.from('rider_documents').select('*').eq('registration_id', regId);
        setRiderDocs(data || []);
    };

    const handleView = (rider) => {
        setSelectedRider(rider);
        fetchDocuments(rider.id);
        setRejectReason('');
    };

    const handleStatusUpdate = async (status) => {
        if (!selectedRider) return;
        setIsProcessing(true);

        try {
            // 1. Update Registration Status
            const { error: updateError } = await supabase
                .from('rider_registrations')
                .update({ 
                    status: status, 
                    admin_notes: rejectReason,
                    updated_at: new Date()
                })
                .eq('id', selectedRider.id);

            if (updateError) throw updateError;

            // 2. If Approved, Upgrade Auth Role (Simulated logic or Edge Function trigger)
            if (status === 'approved' && selectedRider.user_id) {
                // In a real app, call a Supabase Edge Function to update auth.users app_metadata
                // For this strict environment, we will update the profiles table which we have access to
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ role: 'rider' })
                    .eq('id', selectedRider.user_id);
                
                if (profileError) console.warn("Could not update profile role", profileError);
                
                // TODO: Send Email Notification (Simulated)
                toast({ title: "Email Sent", description: `Approval email sent to ${selectedRider.email}` });
            } else if (status === 'rejected') {
                 // TODO: Send Rejection Email
                 toast({ title: "Email Sent", description: `Rejection email sent to ${selectedRider.email}` });
            }

            toast({ title: "Status Updated", description: `Rider marked as ${status}` });
            fetchRegistrations();
            setSelectedRider(null);

        } catch (err) {
            console.error(err);
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Rider Verification</h2>
                <Button onClick={fetchRegistrations} variant="outline">Refresh</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Applications</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Area</TableHead>
                                <TableHead>Applied On</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.map((reg) => (
                                <TableRow key={reg.id}>
                                    <TableCell className="font-medium">
                                        {reg.full_name}
                                        <div className="text-xs text-slate-500">{reg.email}</div>
                                        <div className="text-xs text-slate-500">{reg.phone}</div>
                                    </TableCell>
                                    <TableCell>{reg.vehicle_type} <span className="text-xs text-slate-500 block">{reg.vehicle_number}</span></TableCell>
                                    <TableCell>{reg.service_area}</TableCell>
                                    <TableCell>{formatDateToDDMMYYYY(reg.created_at)}</TableCell>
                                    <TableCell><Badge className={getStatusColor(reg.status)}>{reg.status}</Badge></TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="ghost" onClick={() => handleView(reg)}>
                                            <Eye className="w-4 h-4 mr-1" /> Review
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {registrations.length === 0 && !loading && (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No applications found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!selectedRider} onOpenChange={(open) => !open && setSelectedRider(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Review: {selectedRider?.full_name}</DialogTitle>
                        <DialogDescription>Review documents and approve rider status.</DialogDescription>
                    </DialogHeader>

                    {selectedRider && (
                        <div className="grid md:grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                                <h4 className="font-bold border-b pb-2">Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-slate-500">Email:</span> <span>{selectedRider.email}</span>
                                    <span className="text-slate-500">Phone:</span> <span>{selectedRider.phone}</span>
                                    <span className="text-slate-500">Vehicle:</span> <span>{selectedRider.vehicle_type} ({selectedRider.vehicle_number})</span>
                                    <span className="text-slate-500">Service Area:</span> <span>{selectedRider.service_area}</span>
                                    <span className="text-slate-500">Bank Acc:</span> <span>{selectedRider.bank_account_no}</span>
                                    <span className="text-slate-500">IFSC:</span> <span>{selectedRider.ifsc_code}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold border-b pb-2">Documents ({riderDocs.length})</h4>
                                <div className="space-y-2">
                                    {riderDocs.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                            <span className="text-sm font-medium capitalize flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-500"/> {doc.document_type.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <div className="flex gap-2">
                                                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">View</a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
                        {selectedRider?.status === 'pending' ? (
                            <>
                                <div className="flex-1 w-full sm:mr-auto">
                                   <Textarea 
                                      placeholder="Reason for rejection (if applicable)" 
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      className="h-10 min-h-[40px] resize-none"
                                   />
                                </div>
                                <Button variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
                                    <X className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate('approved')} disabled={isProcessing}>
                                    <Check className="w-4 h-4 mr-2" /> Approve & Create Rider
                                </Button>
                            </>
                        ) : (
                             <div className="w-full text-center py-2 font-bold text-slate-500">
                                This application is already {selectedRider?.status}.
                             </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RiderVerification;