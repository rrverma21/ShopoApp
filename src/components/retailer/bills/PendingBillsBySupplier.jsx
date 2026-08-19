import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, formatDateToDDMMYYYY } from '@/lib/utils';
import { isPast, differenceInDays } from 'date-fns';

const PendingBillsBySupplier = ({ bills, isLoading }) => {
  const pendingBySupplier = useMemo(() => {
    if (!bills) return {};

    const grouped = bills.reduce((acc, bill) => {
      const supplierName = bill.supplier_name || 'Unassigned Supplier';
      if (!acc[supplierName]) {
        acc[supplierName] = {
          totalAmount: 0,
          bills: [],
        };
      }
      acc[supplierName].totalAmount += bill.amount;
      acc[supplierName].bills.push(bill);
      return acc;
    }, {});

    // Sort suppliers by total amount descending
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  }, [bills]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Bills by Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const supplierEntries = Object.entries(pendingBySupplier);

  if (supplierEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Bills by Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending bills found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Bills by Supplier</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {supplierEntries.map(([supplierName, data]) => {
            const isAnyOverdue = data.bills.some(bill => isPast(new Date(bill.due_date)));
            return (
              <AccordionItem value={supplierName} key={supplierName}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">{supplierName}</span>
                    <div className="flex items-center gap-4">
                      {isAnyOverdue && <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-1 rounded-full">OVERDUE</span>}
                      <span className="text-lg font-bold">{formatPrice(data.totalAmount)}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pl-4 border-l-2 ml-2">
                    {data.bills.map(bill => {
                      const dueDate = new Date(bill.due_date);
                      const overdue = isPast(dueDate);
                      const daysOverdue = differenceInDays(new Date(), dueDate);

                      return (
                        <li key={bill.id} className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-muted-foreground">{bill.description || `Bill #${bill.bill_number}`}</p>
                            <p className={overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                              Due: {formatDateToDDMMYYYY(bill.due_date)}
                              {overdue && ` (${daysOverdue} days overdue)`}
                            </p>
                          </div>
                          <span className="font-semibold">{formatPrice(bill.amount)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PendingBillsBySupplier;