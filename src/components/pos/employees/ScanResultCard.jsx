import React, { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getEmployeeInitials } from '@/lib/utils';

const ScanResultCard = ({ result, clearResult }) => {
  useEffect(() => {
    if (result && result.success) {
      const timer = setTimeout(() => {
        clearResult();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [result, clearResult]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full"
      >
        <Card className={`border-l-4 shadow-lg ${result.success ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {result.success ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </h3>
                
                {result.employee && (
                  <div className="mt-4 flex items-center gap-3 bg-white/60 p-3 rounded-lg border border-slate-100">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={result.employee.avatar_url} />
                      <AvatarFallback className="bg-blue-600 text-white font-bold">
                        {getEmployeeInitials(result.employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">{result.employee.name}</p>
                      <p className="text-xs text-slate-500 font-mono">ID: {result.employee.id.slice(0,8)}</p>
                    </div>
                    {result.type && (
                        <Badge variant="outline" className="ml-auto capitalize bg-blue-50 text-blue-700 border-blue-200">
                            {result.type}
                        </Badge>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default ScanResultCard;