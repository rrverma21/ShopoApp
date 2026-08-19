import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar, Save, ArrowLeft, Loader2, CheckCircle2, XCircle, QrCode } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import AttendanceStatusBadge from '@/components/pos/employees/AttendanceStatusBadge';

const AttendanceTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    if (user) loadData();
  }, [user, date]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active employees
      const { data: emps, error: empError } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');
      
      if (empError) throw empError;

      // 2. Fetch existing attendance for date
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .in('employee_id', emps.map(e => e.id))
        .eq('date', date);

      if (attError) throw attError;

      // 3. Merge data
      const initialData = {};
      emps.forEach(emp => {
        const record = attendance.find(a => a.employee_id === emp.id);
        initialData[emp.id] = record ? {
          status: record.status,
          check_in_time: record.check_in_time || '',
          check_out_time: record.check_out_time || '',
          notes: record.notes || '',
          id: record.id,
          scan_type: record.scan_type
        } : {
          status: 'present',
          check_in_time: '09:00',
          check_out_time: '18:00',
          notes: ''
        };
      });

      setEmployees(emps);
      setAttendanceData(initialData);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (empId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertData = employees.map(emp => ({
        employee_id: emp.id,
        date: date,
        status: attendanceData[emp.id].status,
        check_in_time: attendanceData[emp.id].status === 'present' ? attendanceData[emp.id].check_in_time : null,
        check_out_time: attendanceData[emp.id].status === 'present' ? attendanceData[emp.id].check_out_time : null,
        notes: attendanceData[emp.id].notes,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(upsertData, { onConflict: 'employee_id, date' });

      if (error) throw error;
      toast({ title: "Success", description: "Attendance saved successfully" });
      loadData(); 
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save attendance", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status) => {
    const newData = { ...attendanceData };
    employees.forEach(emp => {
      newData[emp.id] = { ...newData[emp.id], status };
    });
    setAttendanceData(newData);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 pb-24">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/pos/employees')} className="hover:bg-slate-100 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Attendance Tracker</h1>
        </div>
        
        <Button onClick={() => navigate('/pos/employees/attendance/scanner')} className="bg-indigo-600 hover:bg-indigo-700">
            <QrCode className="w-4 h-4 mr-2" /> Open Kiosk Scanner
        </Button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 sticky top-20 z-20 transition-all">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Date Picker */}
          <div className="relative w-full md:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="pl-10 w-full md:w-[220px] bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
            />
          </div>
          
          {/* Center: Bulk Actions */}
          <div className="flex flex-row gap-3 w-full md:w-auto justify-center">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => markAll('present')} 
              className="flex-1 md:flex-none border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 transition-colors bg-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> All Present
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => markAll('absent')} 
              className="flex-1 md:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors bg-white"
            >
              <XCircle className="w-4 h-4 mr-2" /> All Absent
            </Button>
          </div>
          
          {/* Right: Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:shadow-lg min-w-[140px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Records'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg w-full animate-pulse" />
          ))}
        </div>
      ) : (
        <Card className="border-slate-200 shadow-sm rounded-lg overflow-hidden bg-white border border-gray-200">
          <div className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No active employees</h3>
                <p className="text-slate-500">Add employees to start tracking attendance.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/pos/employees')}>Go to Employees</Button>
              </div>
            ) : (
              employees.map((emp, index) => {
                const currentData = attendanceData[emp.id] || {};
                const isPresent = currentData.status === 'present';
                
                return (
                  <div 
                    key={emp.id} 
                    className={cn(
                      "p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6 items-start md:items-center transition-colors duration-200 border-b border-gray-100 last:border-0 hover:bg-gray-50",
                      index % 2 !== 0 ? "bg-gray-50/50" : "bg-white"
                    )}
                  >
                    {/* Employee Info - 3 Cols */}
                    <div className="md:col-span-3 flex flex-col justify-center min-w-0">
                      <h3 className="font-bold text-slate-900 truncate text-base">{emp.name}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">{emp.role?.replace('_', ' ')}</p>
                      {currentData.scan_type && (
                          <div className="mt-1">
                              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100">
                                Last Scan: {currentData.scan_type}
                              </Badge>
                          </div>
                      )}
                    </div>

                    {/* Status - 3 Cols */}
                    <div className="md:col-span-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-slate-500 md:hidden font-medium">Status</Label>
                        <RadioGroup 
                          value={currentData.status} 
                          onValueChange={(val) => handleUpdate(emp.id, 'status', val)}
                          className="flex flex-wrap gap-4 items-center"
                        >
                          <div className="flex items-center space-x-2 cursor-pointer group">
                            <RadioGroupItem value="present" id={`p-${emp.id}`} className="text-green-600 border-green-600 focus:ring-green-600" />
                            <Label htmlFor={`p-${emp.id}`} className={cn("cursor-pointer font-normal transition-colors group-hover:text-green-700", currentData.status === 'present' ? "text-green-700 font-medium" : "text-slate-600")}>Present</Label>
                          </div>
                          <div className="flex items-center space-x-2 cursor-pointer group">
                            <RadioGroupItem value="absent" id={`a-${emp.id}`} className="text-red-600 border-red-600 focus:ring-red-600" />
                            <Label htmlFor={`a-${emp.id}`} className={cn("cursor-pointer font-normal transition-colors group-hover:text-red-700", currentData.status === 'absent' ? "text-red-700 font-medium" : "text-slate-600")}>Absent</Label>
                          </div>
                          <div className="flex items-center space-x-2 cursor-pointer group">
                            <RadioGroupItem value="leave" id={`l-${emp.id}`} className="text-yellow-600 border-yellow-600 focus:ring-yellow-600" />
                            <Label htmlFor={`l-${emp.id}`} className={cn("cursor-pointer font-normal transition-colors group-hover:text-yellow-700", currentData.status === 'leave' ? "text-yellow-700 font-medium" : "text-slate-600")}>Leave</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    {/* Time Inputs - 3 Cols Combined */}
                    <div className="md:col-span-3 grid grid-cols-2 gap-3 items-end">
                        <div className="flex flex-col gap-1.5 w-full">
                          <Label className="text-xs font-medium text-slate-500">Check In</Label>
                          <div className="relative">
                            <Input 
                              type="time" 
                              disabled={!isPresent}
                              className={cn(
                                "h-9 text-sm transition-all w-full min-w-[80px]", 
                                !isPresent ? "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed" : "bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                              )}
                              value={currentData.check_in_time}
                              onChange={(e) => handleUpdate(emp.id, 'check_in_time', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 w-full">
                          <Label className="text-xs font-medium text-slate-500">Check Out</Label>
                          <div className="relative">
                            <Input 
                              type="time" 
                              disabled={!isPresent}
                              className={cn(
                                "h-9 text-sm transition-all w-full min-w-[80px]", 
                                !isPresent ? "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed" : "bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                              )}
                              value={currentData.check_out_time}
                              onChange={(e) => handleUpdate(emp.id, 'check_out_time', e.target.value)}
                            />
                          </div>
                        </div>
                    </div>

                    {/* Notes - 3 Cols */}
                    <div className="md:col-span-3">
                      <div className="flex flex-col gap-1.5 w-full">
                        <Label className="text-xs font-medium text-slate-500 md:invisible md:h-0 md:mb-0">Notes</Label>
                        <Input 
                          placeholder="Notes (optional)" 
                          className="h-9 text-sm border-slate-200 focus-visible:ring-blue-500 bg-white w-full shadow-sm"
                          value={currentData.notes}
                          onChange={(e) => handleUpdate(emp.id, 'notes', e.target.value)}
                        />
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AttendanceTracker;