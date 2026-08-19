import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeSVG({ value, format = "CODE128", width = 1.2, height = 45, displayValue = true }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000",
          fontSize: 10,
          fontOptions: "bold",
          textMargin: 1
        });
      } catch (err) {
        try {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width: width,
            height: height,
            displayValue: displayValue,
            margin: 0,
            fontSize: 10,
            textMargin: 1
          });
        } catch (e) {
          console.error("Barcode generation failed", e);
        }
      }
    }
  }, [value, format, width, height, displayValue]);

  return (
    <svg 
      ref={svgRef} 
      className="barcode max-w-full h-auto object-contain" 
    />
  );
}