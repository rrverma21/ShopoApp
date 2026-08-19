import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuotation } from '@/contexts/QuotationContext';
import QuotationForm from '@/components/pos/quotations/QuotationForm';
import { Loader2 } from 'lucide-react';

const EditQuotationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchQuotationById, updateQuotation } = useQuotation();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchQuotationById(id);
      if (data) {
        if (data.status !== 'Draft') {
           navigate(`/pos/quotations/${id}`); // Redirect if not draft
           return;
        }
        setQuotation(data);
      } else {
        navigate('/pos/quotations');
      }
      setLoading(false);
    };
    loadData();
  }, [id, fetchQuotationById, navigate]);

  const handleSubmit = async (data) => {
    setSaving(true);
    const result = await updateQuotation(id, data);
    setSaving(false);
    if (result) {
      navigate(`/pos/quotations/${id}`);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>;
  if (!quotation) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Quotation {quotation.quotation_number}</h1>
        <p className="text-slate-500">Update draft quotation details.</p>
      </div>
      
      <QuotationForm initialData={quotation} onSubmit={handleSubmit} loading={saving} />
    </div>
  );
};

export default EditQuotationPage;