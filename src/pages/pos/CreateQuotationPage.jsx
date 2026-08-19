import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotation } from '@/contexts/QuotationContext';
import QuotationForm from '@/components/pos/quotations/QuotationForm';

const CreateQuotationPage = () => {
  const navigate = useNavigate();
  const { createQuotation } = useQuotation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data) => {
    setLoading(true);
    const result = await createQuotation(data);
    setLoading(false);
    if (result) {
      navigate(`/pos/quotations/${result.id}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Quotation</h1>
        <p className="text-slate-500">Draft a new estimate for your customer.</p>
      </div>
      
      <QuotationForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
};

export default CreateQuotationPage;