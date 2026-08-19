import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Filter, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SegmentationPage = () => {
    const { toast } = useToast();

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Filter className="w-8 h-8 text-emerald-600" />
                        Customer Segments
                    </h1>
                    <p className="text-slate-500 mt-2">Group customers based on behavior for targeted offers.</p>
                </div>
                <Button onClick={() => toast({description: "🚧 Segment builder is under construction!"})}>
                    <Plus className="w-4 h-4 mr-2" /> Create Segment
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['VIP Customers', 'Inactive (>30 days)', 'High Value (>₹5000)'].map((segment, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-400" />
                                {segment}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-slate-500">Total Customers</span>
                                <span className="font-bold text-lg">{Math.floor(Math.random() * 200) + 10}</span>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => toast({description: "🚧 Edit coming soon!"})}>Edit Criteria</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default SegmentationPage;