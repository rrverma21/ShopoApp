import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, FileDown, Image as ImageIcon, Palette, LayoutGrid, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
// Removed the incorrect import: import { Poppins } from 'jspdf-poppins';
import 'jspdf-autotable';
import { formatPrice, calculateDiscountPercentage } from '@/lib/utils';

// Poppins font data (base64 encoded) - Placeholder.
// In a real application, you would load these from actual font files.
// For demonstration and to resolve the immediate error, we'll use a simplified approach
// or acknowledge that direct font embedding requires actual font data.
// Since `jspdf-poppins` is not a standard npm package, we'll remove its usage.
// If custom fonts are critical, they would need to be loaded via base64 or a similar method.

const CatalogueCreator = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const [catalogueTitle, setCatalogueTitle] = useState("Product Catalogue");
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [colorTheme, setColorTheme] = useState('blue');
    const [productsPerPage, setProductsPerPage] = useState('4');

    const fetchProducts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase
                .from('products')
                .select('*, categories(name), brands(name)')
                .eq('is_disabled', false)
                .order('name', { ascending: true });

            if (user.profile.role === 'seller') {
                query = query.eq('seller_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setProducts(data);
        } catch (error) {
            toast({ title: 'Error fetching products', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);
    
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result);
                setLogoPreview(URL.createObjectURL(file));
            };
            reader.readAsDataURL(file);
        } else {
            toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) newSet.delete(productId);
            else newSet.add(productId);
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedProducts.size === filteredProducts.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const generatePdf = async () => {
        if (selectedProducts.size === 0) {
            toast({ title: "No products selected", description: "Please select at least one product.", variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        toast({ title: "Generating Catalogue...", description: "This may take a moment." });
        
        const productsToInclude = products.filter(p => selectedProducts.has(p.id));
        const doc = new jsPDF('p', 'mm', 'a4');
        const A4_WIDTH = 210;
        const A4_HEIGHT = 297;
        const MARGIN = 15;

        // Font handling: Removed custom Poppins font loading due to import error.
        // jsPDF will now use its default font (Helvetica).
        // If custom fonts are required, they need to be embedded using base64 encoded font data
        // and added to jsPDF's VFS using doc.addFileToVFS and doc.addFont.
        doc.setFont('helvetica', 'normal'); // Set default font

        const themes = {
            blue: { primary: '#2563EB', secondary: '#F3F4F6', text: '#111827', headerText: '#FFFFFF' },
            black: { primary: '#111827', secondary: '#F3F4F6', text: '#111827', headerText: '#FFFFFF' },
            gold: { primary: '#D97706', secondary: '#FEF3C7', text: '#111827', headerText: '#FFFFFF' },
            white: { primary: '#FFFFFF', secondary: '#F9FAFB', text: '#111827', headerText: '#111827', border: '#E5E7EB' }
        };
        const theme = themes[colorTheme];

        const addFooter = (pageNumber) => {
            doc.setFont('helvetica', 'light'); // Using helvetica
            doc.setFontSize(8);
            doc.setTextColor(theme.text);
            doc.text(`${user.profile.business_name || ''} | ${user.profile.phone || ''} | ${window.location.origin}`, A4_WIDTH / 2, A4_HEIGHT - 8, { align: 'center' });
            doc.text(`Page ${pageNumber}`, A4_WIDTH - MARGIN, A4_HEIGHT - 8, { align: 'right' });
        };
        
        // Cover Page
        doc.setFillColor(theme.primary);
        doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, 'F');
        if (logo) {
            const imgProps = doc.getImageProperties(logo);
            const aspect = imgProps.width / imgProps.height;
            let w = 50, h = 50 / aspect;
            if (h > 50) { h = 50; w = 50 * aspect; }
            doc.addImage(logo, 'PNG', (A4_WIDTH - w) / 2, A4_HEIGHT / 2 - 60, w, h);
        }
        doc.setFont('helvetica', 'bold'); // Using helvetica
        doc.setFontSize(32);
        doc.setTextColor(theme.headerText);
        doc.text(catalogueTitle, A4_WIDTH / 2, A4_HEIGHT / 2, { align: 'center' });
        
        addFooter(1);

        // Index Page
        doc.addPage();
        doc.setFont('helvetica', 'bold'); // Using helvetica
        doc.setFontSize(24);
        doc.setTextColor(theme.text);
        doc.text('Table of Contents', A4_WIDTH / 2, MARGIN + 10, { align: 'center' });
        
        const indexBody = productsToInclude.map((p, i) => [p.name, '...']);
        doc.autoTable({
            startY: MARGIN + 30,
            head: [['Product', 'Page']],
            body: indexBody,
            theme: 'grid',
            headStyles: { font: 'helvetica', fontStyle: 'bold', fillColor: theme.primary, textColor: theme.headerText }, // Using helvetica
            bodyStyles: { font: 'helvetica', fontStyle: 'normal' }, // Using helvetica
        });
        let indexTable = doc.lastAutoTable;
        let pageCounter = 3;

        // Product Pages
        const ppp = parseInt(productsPerPage);
        const productChunks = [];
        for (let i = 0; i < productsToInclude.length; i += ppp) {
            productChunks.push(productsToInclude.slice(i, i + ppp));
        }

        const productPageStart = pageCounter;

        for (const chunk of productChunks) {
            doc.addPage();
            let y = MARGIN;
            const cardHeight = (A4_HEIGHT - (MARGIN * 2) - ((chunk.length -1) * 5) ) / chunk.length;
            
            for (const product of chunk) {
                if (y + cardHeight > A4_HEIGHT - MARGIN && chunk.indexOf(product) > 0) {
                  doc.addPage();
                  pageCounter++;
                  y = MARGIN;
                }
                
                doc.setFillColor(theme.secondary);
                doc.roundedRect(MARGIN, y, A4_WIDTH - (MARGIN*2), cardHeight, 3, 3, 'F');

                const image_url = product.image_url;
                if(image_url) {
                    try {
                        const response = await fetch(image_url);
                        const blob = await response.blob();
                        const imgData = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                        const imgProps = doc.getImageProperties(imgData);
                        const imgW = cardHeight - 10;
                        const imgH = (imgProps.height * imgW) / imgProps.width;
                        doc.addImage(imgData, 'JPEG', MARGIN + 5, y + 5, imgW, imgH, undefined, 'FAST');
                    } catch (e) {
                      console.error(`Failed to fetch image for ${product.name}`, e);
                    }
                }
                
                const textX = MARGIN + ((cardHeight - 10)) + 15;
                const textWidth = A4_WIDTH - textX - MARGIN;

                doc.setFont('helvetica', 'bold'); // Using helvetica
                doc.setFontSize(14);
                doc.setTextColor(theme.text);
                const splitName = doc.splitTextToSize(product.name, textWidth);
                doc.text(splitName, textX, y + 15);
                
                const priceInfo = product.pricing_tiers?.[0] || {};
                const discount = calculateDiscountPercentage(priceInfo.mrp, priceInfo.price);
                doc.setFont('helvetica', 'normal'); // Using helvetica
                doc.setFontSize(12);
                doc.setTextColor(theme.text);
                doc.text(formatPrice(priceInfo.price), textX, y + 25);
                if (discount > 0) {
                    doc.setFontSize(10);
                    doc.setTextColor('#9CA3AF');
                    doc.text(`${formatPrice(priceInfo.mrp)}`, textX + 25, y + 25, { flags: 'strikethrough' });
                    doc.setTextColor('#10B981');
                    doc.text(`${discount}% off`, textX + 50, y + 25);
                }

                doc.setFont('helvetica', 'light'); // Using helvetica
                doc.setFontSize(9);
                doc.setTextColor(theme.text);
                const splitDesc = doc.splitTextToSize(product.description || '', textWidth);
                doc.text(splitDesc, textX, y + 35);
                
                let featuresY = y + 35 + (splitDesc.length * 4) + 5;
                if (product.specifications) {
                    doc.setFont('helvetica', 'normal'); // Using helvetica
                    doc.text('Features:', textX, featuresY);
                    doc.setFont('helvetica', 'light'); // Using helvetica
                    const features = doc.splitTextToSize(product.specifications.replace(/,/g, '\n• '), textWidth - 5);
                    doc.text(`• ${features.join('\n• ')}`, textX, featuresY + 4);
                }

                doc.setFontSize(8);
                doc.setTextColor('#6B7281');
                doc.text(`SKU: ${product.barcodes?.[0] || 'N/A'}`, textX, y + cardHeight - 8);

                y += cardHeight + 5;
            }
            addFooter(pageCounter);
            pageCounter++;
        }
        
        // Update index page numbers
        doc.setPage(2);
        const pages = doc.internal.getNumberOfPages();
        productsToInclude.forEach((p, i) => {
            const pageNum = productPageStart + Math.floor(i/ppp);
            indexTable.body[i].cells[1].text[0] = pageNum.toString();
        });
        doc.autoTable({
            ...indexTable
        });
        addFooter(2);
        
        doc.save(`${catalogueTitle.replace(/\s/g, '_')}.pdf`);
        setIsGenerating(false);
        toast({ title: "Catalogue Generated!", description: "Your PDF has been downloaded." });
    };

    const renderPdfPreview = () => {
        const theme = {
            blue: { primary: 'bg-blue-600', secondary: 'bg-gray-100', text: 'text-gray-900', headerText: 'text-white' },
            black: { primary: 'bg-gray-900', secondary: 'bg-gray-100', text: 'text-gray-900', headerText: 'text-white' },
            gold: { primary: 'bg-yellow-600', secondary: 'bg-yellow-50', text: 'text-gray-900', headerText: 'text-white' },
            white: { primary: 'bg-white', secondary: 'bg-gray-50', text: 'text-gray-900', headerText: 'text-gray-900', border: 'border border-gray-200' }
        }[colorTheme];
        
        const ppp = parseInt(productsPerPage);
        const productsToShow = products.filter(p => selectedProducts.has(p.id)).slice(0, ppp);
        
        return (
            <div className="font-sans bg-white p-4 rounded-lg shadow-inner overflow-y-auto h-full text-xs"> {/* Changed to font-sans */}
                {/* Cover Page */}
                <div className={`w-full aspect-[1/1.414] ${theme.primary} ${theme.headerText} flex flex-col items-center justify-center p-4 mb-4 shadow-lg`}>
                    {logoPreview && <img src={logoPreview} alt="logo" className="h-16 w-auto mb-8"/>}
                    <h1 className="text-3xl font-bold text-center">{catalogueTitle}</h1>
                </div>

                {/* Index Page */}
                <div className="w-full aspect-[1/1.414] bg-white p-6 mb-4 shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-6">Table of Contents</h2>
                    <ul className="space-y-2">
                    {products.filter(p => selectedProducts.has(p.id)).slice(0, 5).map(p => (
                        <li key={p.id} className="flex justify-between items-end border-b border-dashed">
                            <span>{p.name}</span>
                            <span className="flex-grow"></span>
                            <span>... 3</span>
                        </li>
                    ))}
                    </ul>
                </div>
                
                {/* Product Page */}
                <div className={`w-full aspect-[1/1.414] ${theme.secondary} p-4 flex flex-col gap-2 shadow-lg`}>
                    {productsToShow.map(product => {
                         const priceInfo = product.pricing_tiers?.[0] || {};
                         const discount = calculateDiscountPercentage(priceInfo.mrp, priceInfo.price);
                         return (
                            <div key={product.id} className={`flex-1 flex p-2 rounded ${theme.white} ${theme.border}`}>
                                {product.image_url ? 
                                    <img src={product.image_url} className="w-1/3 object-contain"/> :
                                    <div className="w-1/3 flex items-center justify-center bg-gray-100"><ImageIcon className="h-8 w-8 text-gray-400"/></div>
                                }
                                <div className="w-2/3 pl-2 flex flex-col">
                                    <h3 className="font-bold text-sm">{product.name}</h3>
                                    <div className="flex items-baseline gap-2">
                                        <p className="font-semibold text-blue-600">{formatPrice(priceInfo.price)}</p>
                                        {discount > 0 && <p className="text-gray-400 text-xs line-through">{formatPrice(priceInfo.mrp)}</p>}
                                        {discount > 0 && <p className="text-green-600 text-xs font-bold">{discount}% off</p>}
                                    </div>
                                    <p className="text-gray-600 text-[10px] leading-tight mt-1 flex-grow overflow-hidden">{product.description}</p>
                                    <p className="text-gray-400 text-[9px] mt-auto">SKU: {product.barcodes?.[0] || 'N/A'}</p>
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>
        )
    }

    return (
        <>
            <Helmet><title>Dynamic Catalogue Creator - B2B Nexus</title></Helmet>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
                <div className="flex-shrink-0 p-4 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">Dynamic Catalogue Creator</h1>
                            <p className="text-slate-500 text-sm">Design and generate a professional product catalogue.</p>
                        </div>
                        <Button onClick={generatePdf} disabled={isGenerating || selectedProducts.size === 0}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Generate PDF ({selectedProducts.size})
                        </Button>
                    </div>
                </div>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
                    {/* Left Panel: Products & Customization */}
                    <div className="lg:col-span-1 flex flex-col overflow-hidden">
                       <Tabs defaultValue="products" className="flex-grow flex flex-col overflow-hidden">
                            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                                <TabsTrigger value="products">Products</TabsTrigger>
                                <TabsTrigger value="customize">Customize</TabsTrigger>
                            </TabsList>
                            <TabsContent value="products" className="flex-grow overflow-hidden">
                                <Card className="h-full flex flex-col border-0 shadow-none rounded-none">
                                    <CardHeader className="flex-shrink-0">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow overflow-hidden p-0">
                                        {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                            : (
                                            <>
                                                <div className='flex items-center space-x-2 px-6 py-2 border-b text-sm'>
                                                    <Checkbox id="select-all" checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length} onCheckedChange={handleSelectAll} disabled={filteredProducts.length === 0}/>
                                                    <label htmlFor="select-all" className="font-medium">Select All ({selectedProducts.size} / {filteredProducts.length})</label>
                                                </div>
                                                <ScrollArea className="h-[calc(100%-52px)]">
                                                    <div className="p-4 grid grid-cols-2 gap-4">
                                                        {filteredProducts.map(product => (
                                                            <Card key={product.id} className={`relative cursor-pointer transition-all ${selectedProducts.has(product.id) ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleSelectProduct(product.id)}>
                                                                <Checkbox checked={selectedProducts.has(product.id)} className="absolute top-2 right-2 z-10 bg-white"/>
                                                                <div className="aspect-square bg-slate-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                                                                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
                                                                </div>
                                                                <div className="p-2 text-xs">
                                                                    <p className="font-semibold truncate">{product.name}</p>
                                                                    <p className="font-bold">{formatPrice(product.pricing_tiers?.[0]?.price || 0)}</p>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                    {filteredProducts.length === 0 && <p className="text-center py-10 text-slate-500">No products found.</p>}
                                                </ScrollArea>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="customize" className="flex-grow overflow-auto">
                                <Card className="border-0 shadow-none rounded-none">
                                    <CardHeader><CardTitle>Catalogue Customization</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="catalogue-title">Catalogue Title</Label>
                                            <Input id="catalogue-title" value={catalogueTitle} onChange={e => setCatalogueTitle(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Logo</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-20 bg-slate-100 rounded-md flex items-center justify-center">
                                                    {logoPreview ? <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain"/> : <ImageIcon className="h-8 w-8 text-slate-400"/>}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current.click()}><Upload className="h-4 w-4 mr-2"/> Upload Logo</Button>
                                                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden"/>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label>Theme</Label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['blue', 'black', 'gold', 'white'].map(theme => (
                                                    <button key={theme} onClick={() => setColorTheme(theme)} className={`h-12 w-full rounded-md capitalize text-sm transition-all ${colorTheme === theme ? 'ring-2 ring-blue-500' : ''} ${
                                                        {blue: 'bg-blue-600 text-white', black: 'bg-gray-800 text-white', gold: 'bg-yellow-500 text-white', white: 'bg-white border text-black'}[theme]
                                                    }`}>{theme}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Products Per Page</Label>
                                            <Select value={productsPerPage} onValueChange={setProductsPerPage}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="2">2 Products</SelectItem>
                                                    <SelectItem value="3">3 Products</SelectItem>
                                                    <SelectItem value="4">4 Products</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Panel: Live Preview */}
                    <div className="hidden lg:block lg:col-span-2 bg-slate-100 p-4 overflow-hidden">
                        <div className="bg-white rounded-lg h-full shadow-lg">
                           <div className="p-3 border-b text-center font-semibold text-slate-600">Live Preview</div>
                           <div className="h-[calc(100%-41px)] overflow-auto p-4 bg-slate-200">
                             {renderPdfPreview()}
                           </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default CatalogueCreator;