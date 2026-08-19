import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
    ArrowLeft, Mail, Phone, Calendar, DollarSign, 
    Download, ChevronRight, FileText, UserCog, 
    Clock
} from "lucide-react";
import { format } from 'date-fns';
import { getRoleColor } from '@/components/pos/employees/RoleSelector';
import QRCodeDisplay from '@/components/pos/employees/QRCodeDisplay';
import ScanHistoryModal from '@/components/pos/employees/ScanHistoryModal';
import { downloadQRCodePNG, downloadQRCodePDF } from '@/lib/qrCodeGenerator';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { getEmployeeInitials } from '@/lib/utils';

const EmployeeDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({ payments: [], attendance: [], advances: [] });
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (user && id) fetchDetails();
  }, [user, id]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // avatar_url is now fetched automatically with *
      const { data: emp, error } = await supabase.from('employees').select('*').eq('id', id).single();
      if (error) throw error;
      setEmployee(emp);

      // Fetch related data
      const [payRes, attRes, advRes] = await Promise.all([
        supabase.from('employee_payments').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('employee_id', id).order('date', { ascending: false }).limit(30),
        supabase.from('employee_advances').select('*').eq('employee_id', id).order('created_at', { ascending: false })
      ]);

      setHistory({
        payments: payRes.data || [],
        attendance: attRes.data || [],
        advances: advRes.data || []
      });

    } catch (error) {
      console.error(error);
      navigate('/pos/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async (type) => {
    if (!employee) return;
    setIsDownloading(true);
    
    // We target the QR Display wrapper specifically
    const wrapperId = `qr-target-${employee.id}`;
    const filename = `employee-${employee.id.slice(0,8)}-qr`;
    
    try {
        if (type === 'png') {
            await downloadQRCodePNG(wrapperId, filename);
            toast({ title: "Success", description: "QR Code downloaded as PNG" });
        } else {
            await downloadQRCodePDF(wrapperId, filename);
            toast({ title: "Success", description: "QR Code downloaded as PDF" });
        }
    } catch (e) {
        console.error("Download failed", e);
        toast({ 
            title: "Download Failed", 
            description: "Could not generate QR code file. Please try again.", 
            variant: "destructive" 
        });
    } finally {
        setIsDownloading(false);
    }
  };

  if (loading) {
      return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex gap-4 items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4"><Skeleton className="h-[500px] rounded-xl" /></div>
                <div className="lg:col-span-8 space-y-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            </div>
        </div>
      );
  }
  
  if (!employee) return <div className="p-8 text-center text-muted-foreground">Employee not found</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col gap-4">
                <nav className="flex items-center text-sm text-slate-500">
                    <Link to="/pos" className="hover:text-blue-600 transition-colors">POS</Link>
                    <ChevronRight className="w-4 h-4 mx-2" />
                    <Link to="/pos/employees" className="hover:text-blue-600 transition-colors">Employees</Link>
                    <ChevronRight className="w-4 h-4 mx-2" />
                    <span className="font-medium text-slate-900">{employee.name}</span>
                </nav>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/pos/employees')} className="h-10 w-10 rounded-full bg-white border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{employee.name}</h1>
                            <p className="text-slate-500 text-sm">{employee.role.replace('_', ' ').toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Avatar & QR (40% roughly 5 cols on 12 grid) */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                    <Card className="overflow-hidden border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        </div>
                        <CardContent className="pt-0 px-6 pb-8 flex flex-col items-center relative">
                            <div className="relative -mt-16 mb-6">
                                <Avatar className="w-32 h-32 border-4 border-white shadow-lg bg-white ring-4 ring-slate-50">
                                    <AvatarImage src={employee.avatar_url} />
                                    <AvatarFallback className="text-4xl bg-slate-100 text-slate-600 font-bold">
                                        {getEmployeeInitials(employee.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${employee.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold text-slate-900">{employee.name}</h2>
                                <Badge variant="secondary" className={`mt-2 ${getRoleColor(employee.role)}`}>
                                    {employee.role.replace('_', ' ').toUpperCase()}
                                </Badge>
                            </div>

                            {/* QR Section - ID is used for capture */}
                            <div id={`qr-target-${employee.id}`} className="bg-white p-4 rounded-xl w-full">
                                <QRCodeDisplay 
                                    employeeId={employee.id} 
                                    employeeName={employee.name} 
                                    size={180}
                                    className="border-none shadow-none p-0"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full mt-6">
                                <Button 
                                    variant="outline" 
                                    className="w-full border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700"
                                    onClick={() => handleDownloadQR('png')}
                                    disabled={isDownloading}
                                >
                                    <Download className="w-4 h-4 mr-2" /> PNG
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700"
                                    onClick={() => handleDownloadQR('pdf')}
                                    disabled={isDownloading}
                                >
                                    <FileText className="w-4 h-4 mr-2" /> PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Info & History (60% roughly 7 cols on 12 grid) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    
                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal & Employment Info */}
                        <Card className="md:col-span-2 border-slate-200 shadow-md">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <UserCog className="w-4 h-4 text-blue-500" /> Personal & Employment Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email Address</label>
                                        <div className="mt-1 flex items-center gap-2 text-slate-700 font-medium">
                                            <Mail className="w-4 h-4 text-slate-400" /> {employee.email}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phone Number</label>
                                        <div className="mt-1 flex items-center gap-2 text-slate-700 font-medium">
                                            <Phone className="w-4 h-4 text-slate-400" /> {employee.phone}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Date Joined</label>
                                        <div className="mt-1 flex items-center gap-2 text-slate-700 font-medium">
                                            <Calendar className="w-4 h-4 text-slate-400" /> 
                                            {employee.joining_date ? format(new Date(employee.joining_date), 'MMMM d, yyyy') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Monthly Salary</label>
                                        <div className="mt-1 flex items-center gap-2 text-slate-700 font-medium">
                                            <DollarSign className="w-4 h-4 text-slate-400" /> ₹{Number(employee.salary).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 pt-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-2">Status</label>
                                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className={employee.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}>
                                            {employee.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs for History */}
                    <Tabs defaultValue="attendance" className="w-full">
                        <TabsList className="w-full justify-start bg-white border border-slate-200 p-1 mb-4 rounded-lg h-auto">
                            <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2">Attendance</TabsTrigger>
                            <TabsTrigger value="payments" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2">Payments</TabsTrigger>
                            <TabsTrigger value="advances" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2">Advances</TabsTrigger>
                        </TabsList>

                        <TabsContent value="attendance" className="mt-0">
                            <Card className="border-slate-200 shadow-md">
                                <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-100">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-orange-500" /> Recent Activity
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setShowScanHistory(true)} className="text-blue-600 hover:bg-blue-50">
                                        View Full History <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {history.attendance.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500">No attendance records found.</div>
                                        ) : (
                                            history.attendance.map(att => (
                                                <div key={att.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center border border-slate-200">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{format(new Date(att.date), 'MMM')}</span>
                                                            <span className="text-lg font-bold text-slate-800 leading-none">{format(new Date(att.date), 'dd')}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-900">{format(new Date(att.date), 'EEEE')}</span>
                                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                                                    att.status === 'present' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                                    att.status === 'absent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                                }`}>
                                                                    {att.status}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> In: {att.check_in_time ? att.check_in_time.slice(0,5) : '--:--'}</span>
                                                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Out: {att.check_out_time ? att.check_out_time.slice(0,5) : '--:--'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="payments" className="mt-0">
                            <Card className="border-slate-200 shadow-md">
                                <CardHeader className="py-4 border-b border-slate-100"><CardTitle className="text-base font-semibold">Salary History</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {history.payments.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500">No payment history available.</div>
                                        ) : (
                                            history.payments.map(pay => (
                                                <div key={pay.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{format(new Date(pay.year, pay.month - 1), 'MMMM yyyy')}</p>
                                                        <p className="text-xs text-slate-500">Paid: {pay.paid_date || 'Pending'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-900">₹{pay.net_pay.toLocaleString()}</p>
                                                        <Badge variant="outline" className={pay.status === 'paid' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}>
                                                            {pay.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="advances" className="mt-0">
                            <Card className="border-slate-200 shadow-md">
                                <CardHeader className="py-4 border-b border-slate-100"><CardTitle className="text-base font-semibold">Advance Requests</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {history.advances.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500">No advance requests found.</div>
                                        ) : (
                                            history.advances.map(adv => (
                                                <div key={adv.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">₹{Number(adv.amount).toLocaleString()}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{format(new Date(adv.date), 'MMM d, yyyy')} • {adv.reason}</p>
                                                    </div>
                                                    <Badge variant={adv.status === 'approved' ? 'default' : adv.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                        {adv.status}
                                                    </Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <ScanHistoryModal 
                open={showScanHistory} 
                onOpenChange={setShowScanHistory} 
                employeeId={employee.id} 
                employeeName={employee.name} 
            />
        </div>
    </div>
  );
};

export default EmployeeDetails;