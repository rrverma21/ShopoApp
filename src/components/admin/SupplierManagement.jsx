import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Link as LinkIcon, Search, Phone, Mail, User, Home } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('suppliers').select('*').order('name');
            if (error) throw error;
            setSuppliers(data);
        } catch (error) {
            toast({ title: "Error fetching suppliers", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setIsSupplierDialogOpen(true);
    };

    const handleDelete = async (supplierId) => {
        if (!window.confirm("Are you sure you want to delete this supplier?")) return;
        try {
            await supabase.from('product_suppliers').delete().eq('supplier_id', supplierId);
            const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
            if (error) throw error;
            toast({ title: "Supplier Deleted" });
            fetchSuppliers();
        } catch (error) {
            toast({ title: "Deletion failed", description: error.message, variant: 'destructive' });
        }
    };

    const handleAssignProducts = (supplier) => {
        setSelectedSupplier(supplier);
        setIsAssignDialogOpen(true);
    };

    const handleDialogClose = () => {
        setEditingSupplier(null);
        setIsSupplierDialogOpen(false);
    };

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.phone && supplier.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return <div className="p-4 md:p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="p-4 md:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Supplier Management</h1>
                    <p className="text-slate-600">Add, edit, and manage your product suppliers.</p>
                </div>
                <Button onClick={() => setIsSupplierDialogOpen(true)} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
            </motion.div>

            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        type="text"
                        placeholder="Search suppliers..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="hidden md:block">
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier Name</TableHead>
                                        <TableHead>Contact Person</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSuppliers.length > 0 ? (
                                        filteredSuppliers.map((supplier) => (
                                            <TableRow key={supplier.id}>
                                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                                <TableCell>{supplier.contact_person}</TableCell>
                                                <TableCell>{supplier.phone}</TableCell>
                                                <TableCell>{supplier.email}</TableCell>
                                                <TableCell>{supplier.address}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="outline" size="sm" onClick={() => handleAssignProducts(supplier)}>
                                                            <LinkIcon className="mr-2 h-3 w-3" /> Assign
                                                        </Button>
                                                        <Button variant="outline" size="icon" onClick={() => handleEdit(supplier)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="destructive" size="icon" onClick={() => handleDelete(supplier.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers found.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="md:hidden grid grid-cols-1 gap-4">
                {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(supplier => (
                        <Card key={supplier.id} className="glass-effect">
                            <CardHeader>
                                <CardTitle>{supplier.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {supplier.contact_person && <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-500" /> {supplier.contact_person}</p>}
                                {supplier.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /> {supplier.phone}</p>}
                                {supplier.email && <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-slate-500 flex-shrink-0" /> {supplier.email}</p>}
                                {supplier.address && <p className="flex items-start gap-2"><Home className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" /> {supplier.address}</p>}
                            </CardContent>
                            <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleAssignProducts(supplier)}>
                                    <LinkIcon className="mr-2 h-3 w-3" /> Assign Products
                                </Button>
                                <div className="flex w-full gap-2">
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(supplier)}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(supplier.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-16 text-slate-500 col-span-full">
                        <p>{searchTerm ? 'No suppliers found matching your search.' : 'No suppliers found.'}</p>
                    </div>
                )}
            </div>

            <SupplierDialog
                isOpen={isSupplierDialogOpen}
                onOpenChange={setIsSupplierDialogOpen}
                onClose={handleDialogClose}
                supplier={editingSupplier}
                onSuccess={fetchSuppliers}
            />

            {selectedSupplier && (
                <AssignProductsDialog
                    isOpen={isAssignDialogOpen}
                    onOpenChange={setIsAssignDialogOpen}
                    supplier={selectedSupplier}
                />
            )}
        </div>
    );
};

const SupplierDialog = ({ isOpen, onOpenChange, onClose, supplier, onSuccess }) => {
    const isEditing = !!supplier;
    const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData(supplier);
            } else {
                setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
            }
        }
    }, [supplier, isEditing, isOpen]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let error;
            if (isEditing) {
                ({ error } = await supabase.from('suppliers').update(formData).eq('id', supplier.id));
            } else {
                ({ error } = await supabase.from('suppliers').insert(formData));
            }
            if (error) throw error;
            toast({ title: `Supplier ${isEditing ? 'Updated' : 'Added'}` });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast({ title: "Operation failed", description: error.message, variant: 'destructive' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange} onClose={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label htmlFor="name">Supplier Name *</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required /></div>
                    <div><Label htmlFor="contact_person">Contact Person</Label><Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} /></div>
                    <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleChange} /></div>
                    <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} /></div>
                    <div><Label htmlFor="address">Address</Label><Input id="address" name="address" value={formData.address} onChange={handleChange} /></div>
                    <Button type="submit" className="w-full">{isEditing ? 'Update Supplier' : 'Add Supplier'}</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const AssignProductsDialog = ({ isOpen, onOpenChange, supplier }) => {
    const [products, setProducts] = useState([]);
    const [assignedProductIds, setAssignedProductIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        if (!supplier) return;
        setLoading(true);
        try {
            const { data: productsData, error: productsError } = await supabase.from('products').select('id, name');
            if (productsError) throw productsError;
            setProducts(productsData);

            const { data: assignedData, error: assignedError } = await supabase.from('product_suppliers').select('product_id').eq('supplier_id', supplier.id);
            if (assignedError) throw assignedError;
            setAssignedProductIds(new Set(assignedData.map(item => item.product_id)));
        } catch (error) {
            toast({ title: "Error fetching data", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [supplier]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    const handleToggleProduct = async (productId) => {
        const isAssigned = assignedProductIds.has(productId);
        const newAssignedIds = new Set(assignedProductIds);
        let error;

        if (isAssigned) {
            ({ error } = await supabase.from('product_suppliers').delete().match({ product_id: productId, supplier_id: supplier.id }));
            newAssignedIds.delete(productId);
        } else {
            ({ error } = await supabase.from('product_suppliers').insert({ product_id: productId, supplier_id: supplier.id }));
            newAssignedIds.add(productId);
        }

        if (error) {
            toast({ title: "Update failed", description: error.message, variant: 'destructive' });
        } else {
            setAssignedProductIds(newAssignedIds);
            toast({ title: `Product ${isAssigned ? 'unassigned' : 'assigned'}` });
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Assign Products to {supplier.name}</DialogTitle>
                </DialogHeader>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        type="text"
                        placeholder="Search products..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {loading ? (
                    <div className="flex-grow flex items-center justify-center">Loading...</div>
                ) : (
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                        {filteredProducts.length === 0 ? (
                            <p className="text-center text-slate-500 py-4">No products found matching your search.</p>
                        ) : (
                            filteredProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100">
                                    <label htmlFor={`product-${product.id}`} className="flex-grow cursor-pointer">{product.name}</label>
                                    <input
                                        type="checkbox"
                                        id={`product-${product.id}`}
                                        checked={assignedProductIds.has(product.id)}
                                        onChange={() => handleToggleProduct(product.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SupplierManagement;