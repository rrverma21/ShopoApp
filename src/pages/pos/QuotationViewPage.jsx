import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuotation } from '@/contexts/QuotationContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import QuotationForm from '@/components/pos/quotations/QuotationForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Edit, Printer } from 'lucide-react';
import { generateQuotationPDF } from '@/lib/quotationPDFGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const QuotationViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchQuotationById, updateQuotationStatus } = useQuotation();
  
  const [quotation, setQuotation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchQuotationById(id);
      setQuotation(data);
      
      if (user) {
        const { data: setts } = await supabase.from('pos_retailer_settings').select('*').eq('user_id', user.id).single();
        setSettings(setts);
      }
      setLoading(false);
    };
    loadData();
  }, [id, fetchQuotationById, user]);

  const handleDownload = () => {
    if (!quotation) return;
    const doc = generateQuotationPDF(quotation, settings, quotation.customer);
    doc.save(`${quotation.quotation_number}.pdf`);
  };

  const handleStatusChange = async (newStatus) => {
    await updateQuotationStatus(id, newStatus);
    setQuotation(prev => ({ ...prev, status: newStatus }));
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!quotation) return <div className="p-8 text-center text-red-500">Quotation not found.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pos/quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quotation {quotation.quotation_number}</h1>
            <p className="text-slate-500 text-sm">Created on {new Date(quotation.quotation_date).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-32">
            <Select value={quotation.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {quotation.status === 'Draft' && (
            <Button variant="outline" onClick={() => navigate(`/pos/quotations/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
          
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>
      
      <div className="opacity-90 pointer-events-none">
          <QuotationForm initialData={quotation} isReadOnly={true} onSubmit={()=>{}} />
      </div>
    </div>
  );
};

export default QuotationViewPage;