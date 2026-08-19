import React from 'react';
    import { Helmet } from 'react-helmet-async';
    import BulkOrderUpload from '@/components/products/BulkOrderUpload';

    const BulkOrderPage = () => {
      return (
        <div className="min-h-screen">
          <Helmet>
            <title>Bulk Order Upload - B2B Nexus</title>
            <meta name="description" content="Easily place bulk orders by uploading an Excel file. Download our template, fill in your requirements, and upload to add items to your cart." />
          </Helmet>
          
          <div className="container mx-auto px-4 py-8">
            <BulkOrderUpload />
          </div>
        </div>
      );
    };

    export default BulkOrderPage;