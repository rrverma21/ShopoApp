import React from 'react';
import { Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const NoMembershipState = () => {
    return (
        <Card className="max-w-2xl mx-auto border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6">
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 blur-xl animate-pulse" />
                    <div className="relative h-20 w-20 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
                        <Crown className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                    </div>
                </div>
                
                <div className="space-y-2 max-w-md">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No Active Membership</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        You are currently on the free tier. Upgrade to a premium plan to unlock advanced inventory tools, unlimited products, and staff accounts.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default NoMembershipState;