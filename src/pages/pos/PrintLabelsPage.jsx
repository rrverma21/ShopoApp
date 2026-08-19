import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Settings2, AlertCircle } from 'lucide-react';
import BarcodeLabelPreview from '@/components/pos/BarcodeLabelPreview';

export default function PrintLabelsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [labels, setLabels] = useState([]);
  
  const { items, sizePreset, symbology, toggles } = location.state || {};

  const handlePrint = () => {
    // Task 1 & 2: Extract only the .print-area HTML content from the DOM
    const printArea = document.querySelector('.print-area');
    if (!printArea || !sizePreset) return;

    // Task 1: Open a new popup window
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert('Please allow popups for this site to print labels.');
      return;
    }

    // Task 3: Build the essential CSS required for the label layout to prevent relying on Tailwind globally
    // This defines explicit sizes, page breaks, and exact @media print dimensions.
    const printCSS = `
      @page { 
        size: ${sizePreset.width}mm ${sizePreset.height}mm; 
        margin: 0; 
      }
      
      html, body { 
        width: ${sizePreset.width}mm !important; 
        margin: 0 !important; 
        padding: 0 !important; 
        background: white !important;
        color: black !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      
      * { box-sizing: border-box; }
      body * { transform: none !important; zoom: 1 !important; }
      
      .print-area { 
        display: block !important; 
        width: ${sizePreset.width}mm !important; 
        margin: 0 !important; 
        padding: 0 !important; 
      }
      
      .label-page { 
        width: ${sizePreset.width}mm !important; 
        height: ${sizePreset.height}mm !important; 
        page-break-after: always !important; 
        break-after: page !important; 
        overflow: hidden !important; 
        display: block !important; 
        margin: 0 !important; 
        padding: 0 !important; 
        border: none !important;
        box-shadow: none !important;
        background: white !important;
        border-radius: 0 !important;
      }
      
      /* Ensure the last page does not force a blank extra page at the end */
      .label-page:last-child { 
        page-break-after: auto !important; 
        break-after: auto !important; 
      }
      
      /* Replicate essential flexbox and layout utility classes used by the React components */
      .flex { display: flex !important; }
      .flex-col { flex-direction: column !important; }
      .items-center { align-items: center !important; }
      .items-end { align-items: flex-end !important; }
      .justify-between { justify-content: space-between !important; }
      .justify-start { justify-content: flex-start !important; }
      .justify-center { justify-content: center !important; }
      .w-full { width: 100% !important; }
      .h-full { height: 100% !important; }
      .text-center { text-align: center !important; }
      .overflow-hidden { overflow: hidden !important; }
      .box-border { box-sizing: border-box !important; }
      .relative { position: relative !important; }
      .absolute { position: absolute !important; }
      .font-bold { font-weight: bold !important; }
      .font-extrabold { font-weight: 800 !important; }
      .font-medium { font-weight: 500 !important; }
      
      .label-content { 
        padding: 1mm !important; 
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      
      /* Barcode specific sizing to ensure it fits the exact mm bounds */
      .barcode { 
        width: 100% !important; 
        max-width: ${sizePreset.width - 2}mm !important; 
        height: ${sizePreset.height > 30 ? '15mm' : '12mm'} !important; 
        display: block !important;
        margin: 0 auto !important;
      }
      
      .no-print { display: none !important; }
    `;

    // Task 1: Write the minimal HTML document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title> <!-- Empty title prevents URL/title printing on margins if enabled -->
          <style>${printCSS}</style>
        </head>
        <body>
          ${printArea.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();

    // Task 1: Wait briefly for the DOM to render the SVG elements, then print and close
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }, 500);
  };

  useEffect(() => {
    if (!items || !sizePreset) {
      navigate('/pos/products');
      return;
    }

    // Expand items by their selected print quantity to generate discrete labels
    const expanded = [];
    items.forEach(item => {
      const qty = parseInt(item.printQty) || 1;
      const barcodeValue = item.barcode || item.sku || item.id.replace(/-/g, '').substring(0, 12);
      
      for(let i=0; i<qty; i++) {
        expanded.push({
          name: item.name,
          sku: item.sku,
          price: item.selling_price,
          barcode: barcodeValue,
          isAutoGenerated: !!item.isAutoGenerated
        });
      }
    });
    setLabels(expanded);

    // Prompt print dialog after brief delay for rendering SVGs to mount
    const timer = setTimeout(() => {
        handlePrint();
    }, 800);

    return () => {
      clearTimeout(timer);
    };
  }, [items, sizePreset, navigate]);

  if (!items || !sizePreset) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="no-print bg-white border-b shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-50 gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back / Edit
            </Button>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Print Preview 
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">
                {labels.length} labels
              </span>
            </h1>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex flex-col text-xs sm:text-sm text-slate-500 text-left sm:text-right">
                <span className="font-medium text-slate-700 flex items-center gap-1 sm:justify-end">
                  {sizePreset.label} ({sizePreset.width}x{sizePreset.height}mm)
                </span>
                <span className="flex items-center gap-1 mt-0.5">
                  <Settings2 className="w-3 h-3" />
                  {[toggles?.showName&&'Name', toggles?.showPrice&&'Price', toggles?.showSKU&&'SKU'].filter(Boolean).join(', ')}
                </span>
            </div>
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:shadow-lg">
                <Printer className="w-4 h-4 mr-2" /> Print Now
            </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto relative">
        <div className="print-helper-note no-print p-4 bg-amber-50 text-amber-900 border-b border-amber-200 flex flex-col gap-1 text-sm font-medium">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> 
            <span><strong>Printing Tip:</strong> A new window will open to handle exact label dimensions. Ensure popups are allowed.</span>
          </div>
          <div className="ml-6 text-amber-700/80 text-xs">
            If your barcode appears clipped or missing, try reducing the amount of data shown (like hiding SKU), or use a larger label size.
          </div>
        </div>
        
        {/* The DOM element we will extract for popup printing */}
        <div className="p-6 w-full flex justify-center">
           <BarcodeLabelPreview labels={labels} sizePreset={sizePreset} symbology={symbology} toggles={toggles} />
        </div>
      </div>
    </div>
  );
}