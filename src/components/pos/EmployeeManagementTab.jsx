import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';

const EmployeeManagementTab = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'staff',
        salary: ''
    });

    useEffect(() => {
        if (user) fetchEmployees();
    }, [user]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast({ title: "Error", description: "Failed to load employees.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.role) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                user_id: user.id,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                salary: formData.salary ? parseFloat(formData.salary) : 0,
                status: 'active', // Default status
                joining_date: editingEmployee ? editingEmployee.joining_date : new Date().toISOString().split('T')[0]
            };

            let error;
            if (editingEmployee) {
                const { error: updateError } = await supabase
                    .from('employees')
                    .update(payload)
                    .eq('id', editingEmployee.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('employees')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast({ title: "Success", description: editingEmployee ? "Employee updated." : "Employee added." });
            setIsDialogOpen(false);
            fetchEmployees();
            resetForm();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this employee?")) return;
        
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted", description: "Employee removed successfully." });
            fetchEmployees();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete employee.", variant: "destructive" });
        }
    };

    const openEdit = (employee) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            role: employee.role,
            salary: employee.salary
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingEmployee(null);
        setFormData({ name: '', email: '', phone: '', role: 'staff', salary: '' });
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Employee Management</CardTitle>
                    <CardDescription>Manage your staff, assign roles, and permissions.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors border-none">
                          <UserPlus className="w-4 h-4" /> Add Employee
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+91 9876543210" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role *</Label>
                                    <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                                        <SelectTrigger id="role"><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="cashier">Cashier</SelectItem>
                                            <SelectItem value="driver">Driver</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="salary">Salary (₹)</Label>
                                    <Input id="salary" type="number" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} placeholder="15000" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors border-none">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {editingEmployee ? 'Update' : 'Add'} Employee
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Salary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">No employees found. Add one to get started.</TableCell>
                            </TableRow>
                        ) : (
                            employees.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell><span className="capitalize px-2 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-900">{emp.role}</span></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{emp.email}</span>
                                            <span className="text-slate-500">{emp.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>₹{emp.salary}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default EmployeeManagementTab;