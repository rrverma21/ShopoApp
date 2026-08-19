import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeDisplay = ({ value, size = 200, level = 'H', includeMargin = true }) => {
  if (!value) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm inline-block border border-slate-100">
      <QRCodeSVG 
        value={value} 
        size={size} 
        level={level} 
        includeMargin={includeMargin} 
      />
    </div>
  );
};

export default QRCodeDisplay;