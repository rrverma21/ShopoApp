import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutTemplate, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const OfferTemplates = () => {
    const { toast } = useToast();

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <LayoutTemplate className="w-8 h-8 text-teal-600" />
                        Offer Templates
                    </h1>
                    <p className="text-slate-500 mt-2">Save time by reusing successful promotion setups.</p>
                </div>
                <Button onClick={() => toast({description: "🚧 Template creator is under construction!"})}>
                    <Plus className="w-4 h-4 mr-2" /> Create Template
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Weekend Flash Sale', 'Holiday Special', 'Clearance BOGO'].map((template, i) => (
                    <Card key={i} className="hover:border-teal-500 transition-colors cursor-pointer" onClick={() => toast({description: "🚧 Template apply coming soon!"})}>
                        <CardHeader>
                            <CardTitle className="text-lg">{template}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 mb-4">Pre-configured settings for quick launch.</p>
                            <Button variant="secondary" className="w-full">Use Template</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default OfferTemplates;