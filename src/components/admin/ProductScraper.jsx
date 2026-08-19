import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Wand2, Save, Database, Play, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const ProductScraper = () => {
    const [url, setUrl] = useState('');
    const [mode, setMode] = useState('single'); // 'single' or 'bulk'
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    
    // For single product mode
    const [singleScrapedData, setSingleScrapedData] = useState(null);
    
    // For bulk mode
    const [bulkScrapedData, setBulkScrapedData] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingToMaster, setIsSavingToMaster] = useState(false);
    
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchMeta = useCallback(async () => {
        if (!user) return;
        const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name')
            .or(`seller_id.is.null,seller_id.eq.${user.id}`);
        if (categoriesError) console.error("Error fetching categories", categoriesError);
        else setCategories(categoriesData || []);

        const { data: brandsData, error: brandsError } = await supabase
            .from('brands')
            .select('id, name')
            .or(`seller_id.is.null,seller_id.eq.${user.id}`);

        if (brandsError) console.error("Error fetching brands", brandsError);
        else setBrands(brandsData || []);
    }, [user]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    const cleanPrice = (priceStr) => {
        if (!priceStr) return 0;
        // Handle ranges or text in price
        const cleanStr = priceStr.toString().replace(/[^0-9.]/g, '');
        return parseFloat(cleanStr) || 0;
    };

    const handleScrape = async () => {
        if (!url) {
            toast({ title: "URL is missing!", description: "Please enter a URL to start scraping.", variant: "destructive" });
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch (e) {
            toast({ title: "Invalid URL", description: "Please enter a valid website URL (e.g., https://example.com).", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setSingleScrapedData(null);
        setBulkScrapedData([]);
        setSelectedProducts(new Set());
        setProgress(0);
        setStatusMessage('Analyzing URL...');

        try {
            if (mode === 'bulk') {
                await handleBulkScrape();
            } else {
                await handleSingleScrape();
            }

        } catch (error) {
            console.error('Scraping failed:', error);
            toast({
                title: "Scraping Failed",
                description: error.message || "Could not fetch data from the URL.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    };

    const handleSingleScrape = async () => {
        setStatusMessage('Scraping product details...');
        const { data, error } = await supabase.functions.invoke('scrape-product-url', {
            body: { url },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);
        
        if (!data.title) {
            throw new Error("Couldn't find product data. Try Bulk Mode if this is a category page.");
        }

        setSingleScrapedData(data);
        toast({ title: "Success", description: `Found product: ${data.title}` });
    };
    
    const handleBulkScrape = async () => {
        setStatusMessage('Extracting product links from page...');
        
        // 1. Call edge function to get links
        const { data: linksData, error: linkError } = await supabase.functions.invoke('extract-product-links', {
            body: { url },
        });

        if (linkError) throw linkError;
        if (!linksData.links || linksData.links.length === 0) {
            throw new Error("No product links found on this page.");
        }

        // Resolve relative URLs
        const baseUrl = new URL(url);
        const uniqueLinks = [...new Set(linksData.links)].map(link => {
            try {
                return new URL(link, baseUrl).href;
            } catch (e) {
                return link;
            }
        });

        toast({ title: "Links Found", description: `Found ${uniqueLinks.length} potential products. Starting scrape...` });
        
        // 2. Initialize bulk data
        const initialBulkData = uniqueLinks.map(link => ({
            url: link,
            status: 'pending', // pending, scraping, success, error
            data: null,
            error: null
        }));
        setBulkScrapedData(initialBulkData);
        
        // 3. Process queue
        const concurrency = 3;
        let completed = 0;
        
        const processItem = async (item, index) => {
             setBulkScrapedData(prev => {
                const newData = [...prev];
                if (newData[index]) {
                    newData[index] = { ...newData[index], status: 'scraping' };
                }
                return newData;
            });

            try {
                const { data, error } = await supabase.functions.invoke('scrape-product-url', {
                    body: { url: item.url },
                });
                
                if (error) throw error;
                if (data.error) throw new Error(data.error);

                setBulkScrapedData(prev => {
                    const newData = [...prev];
                    if (newData[index]) {
                        newData[index] = { ...newData[index], status: 'success', data };
                    }
                    return newData;
                });
                
                // Auto-select successful scrapes ONLY if they have images
                if (data.images && data.images.length > 0) {
                    setSelectedProducts(prev => {
                        const newSet = new Set(prev);
                        newSet.add(index);
                        return newSet;
                    });
                }

            } catch (err) {
                 console.warn(`Failed to scrape ${item.url}:`, err);
                 setBulkScrapedData(prev => {
                    const newData = [...prev];
                    if (newData[index]) {
                        newData[index] = { ...newData[index], status: 'error', error: err.message };
                    }
                    return newData;
                });
            } finally {
                completed++;
                setProgress(Math.round((completed / uniqueLinks.length) * 100));
            }
        };

        // Queue manager
        const queue = [...initialBulkData.map((item, index) => ({ item, index }))];
        const activePromises = [];
        
        const next = () => {
            if (queue.length === 0 && activePromises.length === 0) {
                setIsLoading(false);
                setStatusMessage('Bulk scraping complete!');
                return;
            }
            
            while (queue.length > 0 && activePromises.length < concurrency) {
                const { item, index } = queue.shift();
                const promise = processItem(item, index).then(() => {
                    activePromises.splice(activePromises.indexOf(promise), 1);
                    next();
                });
                activePromises.push(promise);
            }
        };
        
        next();
    };

    const handleToggleSelect = (index) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) newSet.delete(index);
            else newSet.add(index);
            return newSet;
        });
    };

    const handleSelectAll = (checked) => {
        if (checked === true) {
            // Select all SUCCESSFUL items
            const allSuccessIndices = bulkScrapedData
                .map((item, idx) => item.status === 'success' ? idx : -1)
                .filter(idx => idx !== -1);
            setSelectedProducts(new Set(allSuccessIndices));
        } else {
            setSelectedProducts(new Set());
        }
    };

    const handleBulkSaveToProducts = async () => {
        setIsSaving(true);
        let savedCount = 0;
        try {
            const itemsToSave = bulkScrapedData.filter((_, idx) => selectedProducts.has(idx));
            
            if (itemsToSave.length === 0) {
                toast({ title: "No Items Selected", description: "Please select at least one item to save.", variant: "destructive" });
                setIsSaving(false);
                return;
            }

            for (const item of itemsToSave) {
                if (item.status !== 'success' || !item.data) continue;
                
                const scraped = item.data;
                let category_id = null;
                
                if (scraped.categories) {
                    const catName = scraped.categories.split(',')[0].trim();
                    const existingCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                    if (existingCat) {
                        category_id = existingCat.id;
                    }
                }

                const cleanPriceVal = cleanPrice(scraped.price);
                
                const payload = {
                    name: scraped.title,
                    description: [scraped.short_description, scraped.long_description].filter(Boolean).join('\n\n'),
                    specifications: `SKU: ${scraped.sku || 'N/A'}`,
                    stock: 0,
                    min_order_quantity: 1,
                    image_url: scraped.images ? scraped.images.split(',')[0].trim() : null,
                    category_id: category_id,
                    seller_id: user.id,
                    pricing_tiers: [{ min_quantity: 1, price: cleanPriceVal, mrp: cleanPriceVal }],
                    barcodes: scraped.sku ? [scraped.sku] : [],
                    is_disabled: true,
                };

                const { error } = await supabase.from('products').insert(payload);
                if (!error) savedCount++;
            }
            
            toast({ title: "Bulk Save Complete", description: `Successfully saved ${savedCount} products.` });

        } catch (error) {
            toast({ title: "Save Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkSaveToMaster = async () => {
        setIsSavingToMaster(true);
        let savedCount = 0;
        try {
            const itemsToSave = bulkScrapedData.filter((_, idx) => selectedProducts.has(idx));

             if (itemsToSave.length === 0) {
                toast({ title: "No Items Selected", description: "Please select at least one item to save.", variant: "destructive" });
                setIsSavingToMaster(false);
                return;
            }

            for (const item of itemsToSave) {
                if (item.status !== 'success' || !item.data) continue;

                const scraped = item.data;
                const categoryName = scraped.categories ? scraped.categories.split(',')[0].trim() : 'Uncategorized';
                const cleanPriceVal = cleanPrice(scraped.price);
                const imageUrl = scraped.images ? scraped.images.split(',')[0].trim() : null;
                const notes = [scraped.short_description, scraped.long_description].filter(Boolean).join('\n').substring(0, 1000);

                const payload = {
                    name: scraped.title,
                    sku: scraped.sku || null,
                    category: categoryName,
                    mrp: cleanPriceVal,
                    selling_price: cleanPriceVal,
                    unit: 'pcs',
                    notes: notes || null,
                    image_url: imageUrl
                };

                const { error } = await supabase.from('product_master').insert(payload);
                if (!error) savedCount++;
            }
            
            toast({ title: "Bulk Master Add Complete", description: `Added ${savedCount} products to Master.` });

        } catch (error) {
            toast({ title: "Master Save Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingToMaster(false);
        }
    };
    
    const handleSaveSingleToProducts = async () => {
         if (!singleScrapedData) return;
         setIsSaving(true);
         try {
            const scraped = singleScrapedData;
            const cleanPriceVal = cleanPrice(scraped.price);
            
            let category_id = null;
            if (scraped.categories) {
                 const catName = scraped.categories.split(',')[0].trim();
                 const existingCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                 category_id = existingCat ? existingCat.id : null;
            }

            const payload = {
                name: scraped.title,
                description: [scraped.short_description, scraped.long_description].filter(Boolean).join('\n\n'),
                specifications: `SKU: ${scraped.sku || 'N/A'}`,
                stock: 0, 
                min_order_quantity: 1,
                image_url: scraped.images ? scraped.images.split(',')[0].trim() : null,
                category_id: category_id,
                seller_id: user.id,
                pricing_tiers: [{ min_quantity: 1, price: cleanPriceVal, mrp: cleanPriceVal }],
                barcodes: scraped.sku ? [scraped.sku] : [],
                is_disabled: true,
            };
            await supabase.from('products').insert(payload);
            toast({ title: 'Saved!', description: 'Product added to inventory.' });
         } catch(e) {
             toast({ title: 'Error', description: e.message, variant: 'destructive' });
         } finally {
             setIsSaving(false);
         }
    };

    const handleSaveSingleToMaster = async () => {
        if (!singleScrapedData) return;
        setIsSavingToMaster(true);
        try {
            const scraped = singleScrapedData;
            const cleanPriceVal = cleanPrice(scraped.price);
            const imageUrl = scraped.images ? scraped.images.split(',')[0].trim() : null;
            
            const payload = {
                name: scraped.title,
                sku: scraped.sku || null,
                category: scraped.categories ? scraped.categories.split(',')[0].trim() : 'Uncategorized',
                mrp: cleanPriceVal,
                selling_price: cleanPriceVal,
                unit: 'pcs',
                image_url: imageUrl
            };
            await supabase.from('product_master').insert(payload);
            toast({ title: 'Saved!', description: 'Product added to Master Catalog.' });
        } catch(e) {
             toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsSavingToMaster(false);
        }
    };

    return (
       <>
            <Helmet>
                <title>Product Scraper - B2B Nexus</title>
            </Helmet>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
               <Card className="glass-effect">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Wand2 className="text-primary" />
                            Smart Product Scraper
                        </CardTitle>
                        <CardDescription>
                            Automatically fetch product details from any URL. Supports single product pages and bulk scraping from category lists.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex gap-4 items-center">
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="radio" 
                                    id="mode-single" 
                                    name="mode" 
                                    value="single" 
                                    checked={mode === 'single'} 
                                    onChange={(e) => setMode(e.target.value)}
                                    className="accent-primary"
                                />
                                <label htmlFor="mode-single" className="text-sm font-medium cursor-pointer">Single Product</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="radio" 
                                    id="mode-bulk" 
                                    name="mode" 
                                    value="bulk" 
                                    checked={mode === 'bulk'} 
                                    onChange={(e) => setMode(e.target.value)}
                                    className="accent-primary"
                                />
                                <label htmlFor="mode-bulk" className="text-sm font-medium cursor-pointer">Bulk / Category (BETA)</label>
                            </div>
                         </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Input
                                type="url"
                                placeholder={mode === 'bulk' ? "https://store.com/category/widgets" : "https://store.com/product/widget-1"}
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={isLoading}
                                className="h-12 text-base flex-1"
                            />
                            <Button
                                onClick={handleScrape}
                                disabled={isLoading}
                                className="h-12 w-full sm:w-auto text-base"
                                size="lg"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
                                {isLoading ? 'Processing...' : mode === 'bulk' ? 'Scan & Scrape' : 'Fetch Product'}
                            </Button>
                        </div>

                        {isLoading && (
                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{statusMessage}</span>
                                    {mode === 'bulk' && <span>{progress}%</span>}
                                </div>
                                <Progress value={mode === 'single' ? 100 : progress} className="h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {mode === 'single' && singleScrapedData && (
                     <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Scraped Data</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSaveSingleToProducts} disabled={isSaving || isSavingToMaster} size="sm">
                                    <Save className="mr-2 h-4 w-4" /> Save
                                </Button>
                                <Button onClick={handleSaveSingleToMaster} disabled={isSaving || isSavingToMaster} variant="secondary" size="sm">
                                    <Database className="mr-2 h-4 w-4" /> Add to Master
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <ScrapedDataRow label="Name" value={singleScrapedData.title} />
                                    <ScrapedDataRow label="Price" value={singleScrapedData.price} />
                                    <ScrapedDataRow label="SKU" value={singleScrapedData.sku} />
                                    <ScrapedDataRow label="Images" value={singleScrapedData.images} isUrl={true} />
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {mode === 'bulk' && bulkScrapedData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle>Bulk Scraping Results ({bulkScrapedData.length})</CardTitle>
                                    <CardDescription>Select products to import into your system. Only items with images are auto-selected.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={selectedProducts.size === 0 || isSaving || isSavingToMaster}
                                        onClick={handleBulkSaveToProducts}
                                    >
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                        Save Selected ({selectedProducts.size})
                                    </Button>
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        disabled={selectedProducts.size === 0 || isSaving || isSavingToMaster}
                                        onClick={handleBulkSaveToMaster}
                                    >
                                        {isSavingToMaster ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4" />}
                                        Add to Master ({selectedProducts.size})
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox 
                                                    checked={
                                                        bulkScrapedData.some(i => i.status === 'success') &&
                                                        selectedProducts.size === bulkScrapedData.filter(i => i.status === 'success').length
                                                    }
                                                    onCheckedChange={handleSelectAll}
                                                    disabled={!bulkScrapedData.some(i => i.status === 'success')}
                                                />
                                            </TableHead>
                                            <TableHead className="w-[80px]">Image</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bulkScrapedData.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedProducts.has(idx)}
                                                        onCheckedChange={() => handleToggleSelect(idx)}
                                                        disabled={item.status !== 'success'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {item.data?.images ? (
                                                        <img src={item.data.images.split(',')[0]} alt="" className="h-10 w-10 object-cover rounded border" />
                                                    ) : (
                                                        <div className="h-10 w-10 bg-muted rounded" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-sm line-clamp-2" title={item.url}>
                                                        {item.data?.title || item.url}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{item.data?.sku}</div>
                                                    {item.url && (
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center mt-1">
                                                            View Source <ExternalLink className="h-3 w-3 ml-1"/>
                                                        </a>
                                                    )}
                                                </TableCell>
                                                <TableCell>{item.data?.price}</TableCell>
                                                <TableCell>
                                                    {item.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                                                    {item.status === 'scraping' && <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Scraping</Badge>}
                                                    {item.status === 'success' && <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Found</Badge>}
                                                    {item.status === 'error' && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
           </div>
       </>
    );
};

const ScrapedDataRow = ({ label, value, isUrl }) => {
    if (!value) return null;
    
    let displayValue = value;
    if (isUrl && typeof value === 'string') {
        const urls = value.split(',').map(u => u.trim());
        displayValue = (
            <div className="flex flex-wrap gap-2">
                {urls.map((url, i) => (
                    <div key={i} className="relative h-16 w-16 border rounded overflow-hidden group">
                         <img src={url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-white text-xs hover:underline">View</a>
                         </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
      <TableRow>
        <TableCell className="font-medium align-top pt-3 w-[150px]">{label}</TableCell>
        <TableCell className="whitespace-pre-wrap break-words">
          {displayValue}
        </TableCell>
      </TableRow>
    );
  };

export default ProductScraper;