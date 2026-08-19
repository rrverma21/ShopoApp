import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock } from 'lucide-react';

const ScheduleManager = () => {
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <CalendarClock className="w-8 h-8 text-orange-600" />
                        Schedule Manager
                    </h1>
                    <p className="text-slate-500 mt-2">Plan your promotions ahead of time.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Scheduled Offers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-slate-500">
                        <CalendarClock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>Your schedule is clear. Create an offer and schedule it for later!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ScheduleManager;