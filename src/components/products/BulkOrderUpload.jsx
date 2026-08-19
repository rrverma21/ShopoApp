import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import * as XLSX from 'xlsx';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Input } from '@/components/ui/input';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/supabaseClient';
    import { useCart } from '@/contexts/CartContext';
    import { Upload, Download, ListChecks, ShoppingCart, AlertCircle, Filter, FileSpreadsheet, Copy, UploadCloud as CloudUpload } from 'lucide-react';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import {
        AlertDialog,
        AlertDialogContent,
        AlertDialogHeader,
        AlertDialogTitle,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogAction
    } from "@/components/ui/alert-dialog";
    import { getPriceForQuantity } from '@/lib/utils';

    const InstructionStep = ({ icon, title, description, children }) => (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                {icon}
            </div>
            <div className="flex-grow">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                {children && <div className="mt-3">{children}</div>}
            </div>
        </div>
    );

    const BulkOrderUpload = () => {
        const [file, setFile] = useState(null);
        const [isUploading, setIsUploading] = useState(false);
        const { addToCart, cartItems, clearCart } = useCart();
        const [report, setReport] = useState(null);
        const [allCategories, setAllCategories] = useState([]);
        const [selectedCategory, setSelectedCategory] = useState(null);
        const [isDownloading, setIsDownloading] = useState(false);

        useEffect(() => {
            const fetchCategories = async () => {
                const { data, error } = await supabase.from('categories').select('id, name');
                if (error) {
                    toast({ title: "Error fetching categories", description: error.message, variant: "destructive" });
                } else {
                    setAllCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
                }
            };
            fetchCategories();
        }, []);

        const handleFileChange = (e) => {
            const selectedFile = e.target.files[0];
            if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.type === 'application/vnd.ms-excel')) {
                setFile(selectedFile);
            } else {
                toast({
                    variant: "destructive",
                    title: "Invalid File Type",
                    description: "Please upload an Excel file (.xlsx or .xls).",
                });
            }
        };

        const downloadTemplate = () => {
            const worksheet = XLSX.utils.json_to_sheet([
                { 'ProductName': 'Example Product A', 'Quantity': 10, 'Unit': 'pcs' },
                { 'ProductName': 'Example Product B', 'Quantity': 5, 'Unit': 'box' },
            ]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Requirements');
            XLSX.writeFile(workbook, 'B2B_Nexus_Bulk_Order_Template.xlsx');
        };

        const handleDownloadProductList = async () => {
            if (!selectedCategory) {
              toast({
                title: "No Category Selected",
                description: "Please select a category to download the product list.",
                variant: "destructive",
              });
              return;
            }
        
            setIsDownloading(true);
            try {
              const { data, error } = await supabase.rpc('search_products', {
                p_category_ids: [selectedCategory.id],
                p_search_term: null,
                p_brand_ids: null,
              });
        
              if (error) throw error;
        
              if (data.length === 0) {
                toast({
                  title: "No Products Found",
                  description: "There are no products in the selected category to download.",
                });
                return;
              }
        
              const productsToExport = data.map(p => ({
                'ProductName': p.name,
                'Brand': p.brand_name || 'N/A',
                'Category': p.category_name || 'N/A',
                'Description': p.description,
                'Min Order Qty': p.min_order_quantity,
                'Unit': p.unit,
                'Seller': p.seller_business_name || 'N/A',
              }));
        
              const worksheet = XLSX.utils.json_to_sheet(productsToExport);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
              const categoryName = selectedCategory.name.replace(/ /g, '-');
              XLSX.writeFile(workbook, `Products_${categoryName}.xlsx`);
        
            } catch (error) {
              toast({
                title: "Download Failed",
                description: error.message,
                variant: "destructive",
              });
            } finally {
              setIsDownloading(false);
            }
          };

        const processUpload = async () => {
            if (!file) {
                toast({
                    variant: "destructive",
                    title: "No File Selected",
                    description: "Please select an Excel file to upload.",
                });
                return;
            }

            setIsUploading(true);

            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "Empty File",
                        description: "The uploaded Excel file is empty.",
                    });
                    return;
                }

                const requiredColumns = ['ProductName', 'Quantity'];
                const firstRow = json[0];
                const hasRequiredColumns = requiredColumns.every(col => Object.keys(firstRow).includes(col));
                if (!hasRequiredColumns) {
                    toast({
                        variant: "destructive",
                        title: "Invalid Format",
                        description: "The Excel file is missing required columns: ProductName, Quantity.",
                    });
                    return;
                }
                
                const productNames = json.map(row => String(row.ProductName).trim());

                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*, seller:seller_id(id, business_name)')
                    .in('name', productNames)
                    .eq('is_disabled', false);

                if (productsError) throw productsError;

                const addedToCart = [];
                const notFound = [];
                const differentSellers = [];
                let firstSellerId = cartItems.length > 0 ? cartItems[0].seller_id : null;

                if (cartItems.length > 0 && productsData.length > 0 && !firstSellerId) {
                   const { data: productDetails } = await supabase.from('products').select('seller_id').eq('id', cartItems[0].id).single();
                   if (productDetails) firstSellerId = productDetails.seller_id;
                }

                if (!firstSellerId && productsData.length > 0) {
                    firstSellerId = productsData[0].seller_id;
                }
                
                if (cartItems.length > 0 && firstSellerId && productsData.some(p => p.seller_id !== firstSellerId)) {
                   clearCart();
                   toast({ title: "Notice", description: "Your previous cart was cleared to add items from a new seller."});
                   firstSellerId = productsData.find(p => p.seller_id)?.seller_id;
                }

                for (const row of json) {
                    const productName = String(row.ProductName).trim();
                    const quantity = parseInt(row.Quantity, 10);
                    
                    if (!productName || isNaN(quantity) || quantity <= 0) {
                        notFound.push({ name: productName || 'Unnamed Product', reason: 'Invalid name or quantity.' });
                        continue;
                    }

                    const product = productsData.find(p => p.name.toLowerCase() === productName.toLowerCase());
                    
                    if (!product) {
                        notFound.push({ name: productName, reason: 'Product not found or is unavailable.' });
                        continue;
                    }
                    
                    if (product.seller_id !== firstSellerId) {
                        differentSellers.push({ name: productName, reason: `Belongs to a different seller.` });
                        continue;
                    }
                    
                    if (quantity < product.min_order_quantity) {
                        notFound.push({ name: productName, reason: `Minimum order quantity is ${product.min_order_quantity}.` });
                        continue;
                    }
                    
                    const priceInfo = getPriceForQuantity(product, quantity);
                    if (!priceInfo) {
                       notFound.push({ name: productName, reason: `Pricing not available for this quantity.` });
                       continue;
                    }

                    const productWithPrice = { ...product, price: priceInfo.price };
                    addToCart(productWithPrice, quantity);
                    addedToCart.push({ name: product.name, quantity });
                }

                setReport({ addedToCart, notFound, differentSellers });
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Upload Failed",
                    description: error.message || "An error occurred while processing the file.",
                });
            } finally {
                setIsUploading(false);
                setFile(null); 
            }
        };

        return (
            <>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="glass-effect mb-12">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <ListChecks className="w-8 h-8 text-blue-500" />
                                Easy Bulk Ordering
                            </CardTitle>
                            <CardDescription>
                                Follow these steps to quickly add many items to your cart using an Excel file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <InstructionStep
                                icon={<Filter size={16} />}
                                title="1. Select & Download Products"
                                description="First, select a category and click 'Download List' to get an Excel sheet of all products in that category."
                            >
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Select onValueChange={(value) => setSelectedCategory(allCategories.find(c => c.id === value))}>
                                        <SelectTrigger className="w-full sm:w-[280px]">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allCategories.map(category => (
                                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleDownloadProductList} disabled={!selectedCategory || isDownloading} className="w-full sm:w-auto">
                                        <Download className="mr-2 h-4 w-4" />
                                        {isDownloading ? 'Downloading...' : 'Download List'}
                                    </Button>
                                </div>
                            </InstructionStep>

                            <InstructionStep
                                icon={<FileSpreadsheet size={16} />}
                                title="2. Get the Template"
                                description="Download our formatted Excel template. This is where you'll build your order."
                            >
                                <Button onClick={downloadTemplate} variant="outline" className="w-full md:w-auto">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Template
                                </Button>
                            </InstructionStep>
                            
                            <InstructionStep
                                icon={<Copy size={16} />}
                                title="3. Fill Your Template"
                                description="Open both Excel files. Copy the 'ProductName' from the product list and paste it into the 'ProductName' column of your template. Then, fill in the 'Quantity' you need for each item."
                            />
                            
                            <InstructionStep
                                icon={<CloudUpload size={16} />}
                                title="4. Upload & Go!"
                                description="Save your completed template file. Then, upload it below. We'll automatically add all available items to your cart."
                            >
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".xlsx, .xls"
                                        className="flex-grow"
                                    />
                                    <Button onClick={processUpload} disabled={!file || isUploading} className="btn-primary flex-shrink-0">
                                        <Upload className="mr-2 h-4 w-4" />
                                        {isUploading ? 'Processing...' : 'Upload & Add to Cart'}
                                    </Button>
                                </div>
                            </InstructionStep>
                        </CardContent>
                    </Card>
                </motion.div>
                
                {report && (
                    <AlertDialog open={!!report} onOpenChange={() => setReport(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Bulk Upload Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Here's a summary of your bulk order upload.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                                {report.addedToCart.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-green-600 flex items-center gap-2"><ShoppingCart size={16}/>Added to Cart ({report.addedToCart.length})</h4>
                                        <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                                            {report.addedToCart.map((item, i) => <li key={i}>{item.name} (Qty: {item.quantity})</li>)}
                                        </ul>
                                    </div>
                                )}
                                {report.notFound.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-red-600 flex items-center gap-2"><AlertCircle size={16}/>Not Added ({report.notFound.length})</h4>
                                        <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                                            {report.notFound.map((item, i) => <li key={i}>{item.name} - <span className="text-xs text-slate-500">{item.reason}</span></li>)}
                                        </ul>
                                    </div>
                                )}
                                {report.differentSellers.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-yellow-600 flex items-center gap-2"><AlertCircle size={16}/>Skipped Items ({report.differentSellers.length})</h4>
                                         <p className="text-sm text-slate-500 mb-2">These items belong to a different seller and were skipped. Your cart can only contain items from one seller at a time.</p>
                                        <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                                            {report.differentSellers.map((item, i) => <li key={i}>{item.name} - <span className="text-xs text-slate-500">{item.reason}</span></li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogAction onClick={() => setReport(null)}>Close</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </>
        );
    };

    export default BulkOrderUpload;