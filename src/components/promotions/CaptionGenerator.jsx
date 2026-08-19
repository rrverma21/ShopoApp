import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Instagram, Facebook, Twitter, Sparkles } from 'lucide-react';
import { generateCaptions } from '@/utils/promotions/captionGenerator';
import { useToast } from '@/components/ui/use-toast';

const CaptionGenerator = ({ offerData }) => {
    const [captions, setCaptions] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (offerData) {
            setCaptions(generateCaptions(offerData));
        }
    }, [offerData]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Caption Copied!', description: 'Ready to paste into your social media app.' });
    };

    if (!captions) return null;

    return (
        <Card className="mt-6 border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    AI Caption Generator
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <Tabs defaultValue="instagram" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="instagram" className="flex items-center gap-2"><Instagram className="w-4 h-4"/> Instagram</TabsTrigger>
                        <TabsTrigger value="facebook" className="flex items-center gap-2"><Facebook className="w-4 h-4"/> Facebook</TabsTrigger>
                        <TabsTrigger value="twitter" className="flex items-center gap-2"><Twitter className="w-4 h-4"/> Twitter</TabsTrigger>
                    </TabsList>
                    
                    {['instagram', 'facebook', 'twitter'].map((platform) => (
                        <TabsContent key={platform} value={platform}>
                            <div className="relative">
                                <textarea 
                                    className="w-full h-40 p-4 rounded-lg border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    readOnly
                                    value={captions[platform]}
                                />
                                <Button 
                                    size="sm" 
                                    className="absolute bottom-4 right-4 shadow-md"
                                    onClick={() => handleCopy(captions[platform])}
                                >
                                    <Copy className="w-4 h-4 mr-2" /> Copy
                                </Button>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default CaptionGenerator;