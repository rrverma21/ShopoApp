import jsPDF from 'jspdf';
    import 'jspdf-autotable';
    import { formatDateToDDMMYYYY } from '@/lib/utils';
    import { supabase } from '@/lib/supabaseClient';

    const formatPrice = (price) => {
      if (price == null) return 'Rs. 0.00'; // Handle null or undefined prices
      const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
      return `Rs. ${formatted}`;
    };

    export const generateInvoice = async (order) => {
      const doc = new jsPDF();

      const businessName = order.client?.business_name || order.shipping_address?.businessName || 'N/A';
      
      let street = order.shipping_address?.streetAddress || '';
      let city = order.shipping_address?.city || '';
      let pincode = order.shipping_address?.pincode || '';
      let contactPerson = order.shipping_address?.contactPerson || '';
      let phone = order.shipping_address?.phone || '';


      doc.setFontSize(22);
      doc.setFont('Noto Sans', 'bold');
      doc.text('B2B Nexus', 14, 22);
      doc.setFontSize(10);
      doc.setFont('Noto Sans', 'normal');
      doc.text('Sector-20, Airoli, Navi mumbai-400708', 14, 28);
      
      doc.setFontSize(18);
      doc.text('INVOICE', 196, 22, { align: 'right' });

      doc.setFontSize(10);
      doc.text(`Invoice #: ${order.id.substring(0, 8)}`, 196, 30, { align: 'right' });
      doc.text(`Date: ${formatDateToDDMMYYYY(order.created_at)}`, 196, 35, { align: 'right' });
      if (order.creator && order.creator.contact_person) {
        doc.text(`Salesman: ${order.creator.contact_person}`, 196, 40, { align: 'right' });
      }

      doc.setFontSize(12);
      doc.setFont('Noto Sans', 'bold');
      doc.text('Bill To:', 14, 50);
      doc.setFont('Noto Sans', 'normal');
      doc.setFontSize(10);
      doc.text(businessName, 14, 56);
      
      let currentY = 61;
      if (contactPerson) {
        doc.text(contactPerson, 14, currentY);
        currentY += 5;
      }
      if (phone) {
        doc.text(phone, 14, currentY);
        currentY += 5;
      }
      if (street) {
        doc.text(street, 14, currentY);
        currentY += 5;
      }
      if (city) {
        doc.text(`${city}${pincode ? `, ${pincode}` : ''}`, 14, currentY);
      } else if (pincode) {
        doc.text(pincode, 14, currentY);
      }

      const tableColumn = ["Sr. No.", "Product", "Quantity", "Unit Price", "Total"];
      const tableRows = [];

      order.order_items.forEach((item, index) => {
        const itemData = [
          index + 1, // Sr. No.
          item.products?.name || 'Product not found',
          item.quantity,
          formatPrice(item.price),
          formatPrice(item.quantity * item.price)
          
        ];
        tableRows.push(itemData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138] },
      });

      let finalY = doc.lastAutoTable.finalY;
      const subtotal = order.total_amount - (order.shipping_charge || 0);
      
      doc.setFontSize(10);
      doc.text('Subtotal:', 140, finalY + 8);
      doc.text(formatPrice(subtotal), 196, finalY + 8, { align: 'right' });
      
      doc.text('Shipping:', 140, finalY + 13);
      doc.text(formatPrice(order.shipping_charge || 0), 196, finalY + 13, { align: 'right' });

      doc.setFontSize(12);
      doc.setFont('Noto Sans', 'bold');
      doc.text('Total Amount:', 140, finalY + 20);
      doc.text(formatPrice(order.total_amount), 196, finalY + 20, { align: 'right' });

      // QR Code logic
      let qrCodeUrl = null;
      if (order.seller?.qr_code_url) {
        qrCodeUrl = order.seller.qr_code_url;
      } else {
        // Fallback to admin's QR code if seller's is not available
        const { data: adminProfile, error: adminError } = await supabase
          .from('profiles')
          .select('qr_code_url')
          .eq('role', 'admin')
          .limit(1)
          .single();
        
        if (!adminError && adminProfile?.qr_code_url) {
          qrCodeUrl = adminProfile.qr_code_url;
        }
      }

      const finishPdf = () => {
        doc.setFontSize(10);
        doc.setFont('Noto Sans', 'normal');
        doc.text('Thank you for your business!', 14, doc.internal.pageSize.height - 15);
        doc.text('Payment is due within 10 days.', 14, doc.internal.pageSize.height - 10);
        doc.output('dataurlnewwindow');
      };

      if (qrCodeUrl) {
        try {
          const response = await fetch(qrCodeUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            try {
              const base64data = reader.result;
              doc.setFontSize(10);
              doc.setFont('Noto Sans', 'bold');
              doc.text('Scan to Pay:', 14, finalY + 15);
              doc.addImage(base64data, 'PNG', 14, finalY + 18, 40, 40);
            } catch (e) {
              console.error("Error adding QR code image to PDF:", e);
            } finally {
              finishPdf();
            }
          };
          reader.onerror = (error) => {
            console.error("FileReader error:", error);
            finishPdf();
          };
        } catch (e) {
          console.error("Error fetching or processing QR code:", e);
          finishPdf();
        }
      } else {
        finishPdf();
      }
    };