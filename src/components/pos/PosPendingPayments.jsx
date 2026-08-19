import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * @deprecated This component has been replaced by PosCredit.jsx
 * Redirecting to the main POS route or handling gracefully.
 */
const PosPendingPayments = () => {
  return (
    <div className="p-8 text-center text-slate-500">
        <h2 className="text-xl font-semibold mb-2">Component Moved</h2>
        <p>This section has been upgraded. Please access Credit Management through the new interface.</p>
    </div>
  );
};

export default PosPendingPayments;