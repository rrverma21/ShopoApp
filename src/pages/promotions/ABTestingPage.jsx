import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ABTestingPage = () => {
    const { toast } = useToast();

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <FlaskConical className="w-8 h-8 text-rose-600" />
                        A/B Testing
                    </h1>
                    <p className="text-slate-500 mt-2">Test different offers to see what converts best.</p>
                </div>
                <Button onClick={() => toast({description: "🚧 Test creator is under construction!"})}>
                    <Plus className="w-4 h-4 mr-2" /> New Test
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Tests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-slate-500">
                        <FlaskConical className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>No active A/B tests. Start experimenting with your offers!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ABTestingPage;