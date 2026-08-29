import React from 'react';
import { ArrowRight, PackagePlus, Truck } from 'lucide-react';

const DeliveryOverview = ({ onViewDeliveries, onBookDelivery }) => (
  <section aria-labelledby="delivery-overview-title" className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
    <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600">
          <Truck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="delivery-overview-title" className="text-lg font-bold text-slate-900">Delivery Overview</h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Track bookings, shipment status and assigned riders in the delivery workspace.</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onBookDelivery} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          Book Delivery
        </button>
        <button type="button" onClick={onViewDeliveries} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
          View Deliveries
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
);

export default DeliveryOverview;
