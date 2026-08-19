import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import jsPDF from 'jspdf';
    import 'jspdf-autotable';
    import { supabase } from '@/lib/supabaseClient';
    import { toast } from '@/components/ui/use-toast';
    import { Button } from '@/components/ui/button';
    import { AlertTriangle, Printer, Download, ChevronDown } from 'lucide-react';
    import { formatDateToDDMMYYYY } from '@/lib/utils';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
    } from "@/components/ui/table";
    import {
      Card,
      CardContent,
      CardHeader,
      CardTitle,
    } from '@/components/ui/card';

    const PendingOrdersSummary = () => {
        const { user } = useAuth();
        const [summary, setSummary] = useState({});
        const [loading, setLoading] = useState(true);
        const [openSuppliers, setOpenSuppliers] = useState({});

        const fetchPendingOrdersSummary = useCallback(async () => {
            setLoading(true);
            try {
                const { data: orders, error: ordersError } = await supabase
                    .from('orders')
                    .select('order_items(quantity, products(id, name, image_url, stock, unit))')
                    .eq('status', 'Pending');

                if (ordersError) throw ordersError;

                const { data: productSuppliers, error: psError } = await supabase
                    .from('product_suppliers')
                    .select('product_id, suppliers(id, name, contact_person, phone, email, address)');

                if (psError) throw psError;

                const supplierMap = {};
                productSuppliers.forEach(ps => {
                    if (!supplierMap[ps.product_id]) {
                        supplierMap[ps.product_id] = [];
                    }
                    supplierMap[ps.product_id].push(ps.suppliers);
                });

                const productSummary = {};
                orders.forEach(order => {
                    order.order_items.forEach(item => {
                        if (item.products) {
                            const { id, name, image_url, stock, unit } = item.products;
                            if (!productSummary[id]) {
                                productSummary[id] = { name, image_url, stock, unit, totalPendingQuantity: 0 };
                            }
                            productSummary[id].totalPendingQuantity += item.quantity;
                        }
                    });
                });

                const supplierSummary = {};
                Object.entries(productSummary).forEach(([productId, productData]) => {
                    const suppliers = supplierMap[productId];
                    if (suppliers && suppliers.length > 0) {
                        suppliers.forEach(supplier => {
                            if (!supplierSummary[supplier.id]) {
                                supplierSummary[supplier.id] = {
                                    supplierInfo: supplier,
                                    products: [],
                                };
                            }
                            supplierSummary[supplier.id].products.push({ id: productId, ...productData });
                        });
                    } else {
                        if (!supplierSummary['unassigned']) {
                            supplierSummary['unassigned'] = {
                                supplierInfo: { id: 'unassigned', name: 'Unassigned Products' },
                                products: [],
                            };
                        }
                        supplierSummary['unassigned'].products.push({ id: productId, ...productData });
                    }
                });

                Object.values(supplierSummary).forEach(s => {
                    s.products.sort((a, b) => b.totalPendingQuantity - a.totalPendingQuantity);
                });

                setSummary(supplierSummary);
                const initialOpenState = Object.keys(supplierSummary).reduce((acc, key) => {
                    acc[key] = true;
                    return acc;
                }, {});
                setOpenSuppliers(initialOpenState);

            } catch (error) {
                toast({ title: "Error fetching summary", description: error.message, variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        }, []);

        useEffect(() => {
            fetchPendingOrdersSummary();
        }, [fetchPendingOrdersSummary]);

        const toggleSupplier = (supplierId) => {
            setOpenSuppliers(prev => ({ ...prev, [supplierId]: !prev[supplierId] }));
        };

        const handlePrintSupplier = (supplierId) => {
            const printContents = document.getElementById(`supplier-card-${supplierId}`).innerHTML;
            const originalContents = document.body.innerHTML;
            const businessName = user?.profile?.business_name || 'B2B Nexus';
            const address = user?.profile ? `${user.profile.street_address || ''}, ${user.profile.city || ''} - ${user.profile.pincode || ''}` : 'Your Business Address';

            const header = `
                <div style="padding: 2rem;">
                    <h1 style="font-size: 2rem; font-weight: bold;">${businessName}</h1>
                    <p>${address}</p>
                    <h2 style="font-size: 1.5rem; font-weight: bold; margin-top: 1rem;">Pending Orders Summary</h2>
                    <p style="color: grey;">Date: ${formatDateToDDMMYYYY(new Date())}</p>
                </div>
            `;

            document.body.innerHTML = header + printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        };

        const handleDownloadPdfSupplier = (supplierId) => {
            const { supplierInfo, products } = summary[supplierId];
            const doc = new jsPDF();
            const businessName = user?.profile?.business_name || 'B2B Nexus';
            const address = user?.profile ? `${user.profile.street_address || ''}, ${user.profile.city || ''} - ${user.profile.pincode || ''}` : 'Your Business Address';

            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text(businessName, 14, 22);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(address, 14, 28);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Orders Created on", 14, 40);
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Date: ${formatDateToDDMMYYYY(new Date())}`, 14, 46);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Supplier: ${supplierInfo.name}`, 14, 56);

            const tableColumn = ["Sr. No.", "Product Name", "Quantity", "Unit"];
            const tableRows = products.map((product, index) => [
                index + 1,
                product.name,
                product.totalPendingQuantity,
                product.unit,
            ]);

            doc.autoTable({
                startY: 62,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [34, 40, 49] },
                styles: { font: 'helvetica', fontSize: 10 },
            });
            
            const date = new Date().toISOString().split('T')[0];
            doc.save(`pending-orders-${supplierInfo.name.replace(/\s+/g, '-')}-${date}.pdf`);
            toast({ title: "Download Started", description: `PDF for ${supplierInfo.name} is being downloaded.` });
        };

        if (loading) {
            return <div className="p-4 md:p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
        }

        return (
            <div className="p-4 md:p-8 print-container">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Pending Orders Summary</h1>
                        <p className="text-slate-600 text-sm sm:text-base">A supplier-wise summary of all pending orders.</p>
                    </div>
                </motion.div>

                {Object.keys(summary).length === 0 ? (
                    <p className="text-center text-slate-500 py-10">No pending orders found.</p>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(summary).map(([supplierId, { supplierInfo, products }]) => (
                            <motion.div key={supplierId} id={`supplier-card-${supplierId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="print:shadow-none print:border-none">
                                <Card className="overflow-hidden">
                                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 print:bg-slate-100">
                                        <div onClick={() => toggleSupplier(supplierId)} className="flex-grow flex items-center cursor-pointer">
                                            <CardTitle className="text-lg sm:text-xl">{supplierInfo.name}</CardTitle>
                                            <ChevronDown className={`ml-4 transition-transform ${openSuppliers[supplierId] ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex gap-2 print:hidden w-full sm:w-auto">
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handlePrintSupplier(supplierId); }} className="flex-1 sm:flex-initial">
                                                <Printer className="mr-2 h-4 w-4" /> Print
                                            </Button>
                                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadPdfSupplier(supplierId); }} className="flex-1 sm:flex-initial">
                                                <Download className="mr-2 h-4 w-4" /> PDF
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {openSuppliers[supplierId] && (
                                        <CardContent className="p-0">
                                            <div className="md:hidden">
                                                {products.map((product, index) => (
                                                    <div key={product.id} className="border-b p-4 space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0 print:hidden">
                                                                {product.image_url ? (
                                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain rounded-md" />
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs">No Img</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{product.name}</div>
                                                                <div className="text-sm text-slate-500">{product.unit}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-slate-500">Pending Qty:</span>
                                                            <span className="font-bold text-blue-600 text-lg">{product.totalPendingQuantity}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-slate-500">Current Stock:</span>
                                                            <span className="font-semibold">{product.stock}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-slate-500">Status:</span>
                                                            {product.totalPendingQuantity > product.stock ? (
                                                                <div className="flex items-center gap-2 text-red-600">
                                                                    <AlertTriangle size={16} />
                                                                    <span className="text-xs font-semibold">Insufficient</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-green-600">
                                                                    <span className="text-xs font-semibold">In Stock</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="hidden md:block overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[50px]">Sr.</TableHead>
                                                            <TableHead>Product</TableHead>
                                                            <TableHead className="text-right">Pending Qty</TableHead>
                                                            <TableHead className="text-right">Current Stock</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {products.map((product, index) => (
                                                            <TableRow key={product.id} className="print:break-inside-avoid">
                                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0 print:hidden">
                                                                            {product.image_url ? (
                                                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain rounded-md" />
                                                                            ) : (
                                                                                <span className="text-slate-400 text-xs">No Img</span>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium">{product.name}</div>
                                                                            <div className="text-sm text-slate-500">{product.unit}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-blue-600 text-lg">{product.totalPendingQuantity}</TableCell>
                                                                <TableCell className="text-right font-semibold">{product.stock}</TableCell>
                                                                <TableCell>
                                                                    {product.totalPendingQuantity > product.stock ? (
                                                                        <div className="flex items-center gap-2 text-red-600">
                                                                            <AlertTriangle size={16} />
                                                                            <span className="text-xs font-semibold">Insufficient</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 text-green-600">
                                                                            <span className="text-xs font-semibold">In Stock</span>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    export default PendingOrdersSummary;