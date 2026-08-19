import React from 'react';
import AddressForm from '@/components/forms/AddressForm';
import RegionSelector from '@/components/RegionSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

const AddressFormDemo = () => {
  const handleAddressSubmit = async (data) => {
    console.log("Address Submitted:", data);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="text-blue-600 w-6 h-6" />
            Address Form Validation Demo
          </h1>
          <p className="text-slate-500 mt-1">
            Test the regional address validation for India and the UK. Change the region below to see fields and validations update automatically.
          </p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <RegionSelector />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <AddressForm 
            title="Shipping Address" 
            description="Enter delivery details" 
            onSubmit={handleAddressSubmit} 
          />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Validation Rules</CardTitle>
              <CardDescription>How the region affects validation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">🇮🇳 India Region</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Phone:</strong> Exactly 10 digits required</li>
                  <li><strong>Pincode:</strong> Exactly 6 digits required</li>
                  <li><strong>State:</strong> Dropdown with 36 states/UTs (Required)</li>
                  <li><strong>Country:</strong> Locked to India</li>
                </ul>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">🇬🇧 UK Region</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Phone:</strong> 10-11 digits standard UK format</li>
                  <li><strong>Postcode:</strong> Valid UK alphanumeric format (e.g., SW1A 1AA)</li>
                  <li><strong>County:</strong> Dropdown with 4 UK regions (Optional)</li>
                  <li><strong>Country:</strong> Locked to United Kingdom</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddressFormDemo;