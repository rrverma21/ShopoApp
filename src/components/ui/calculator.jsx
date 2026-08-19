import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Delete, Check, X, RotateCcw, Delete as DeleteIcon } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

const Calculator = ({ initialValue = 0, referencePrice = 0, onApply, onClose }) => {
  const [display, setDisplay] = useState(initialValue ? String(initialValue) : '0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [history, setHistory] = useState([]);

  // Shortcuts for markup based on reference price (Cost Price)
  const markups = [10, 20, 30, 50, 100];

  const handleNumber = (num) => {
    if (isNewNumber) {
      setDisplay(String(num));
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (isNewNumber) {
      setDisplay('0.');
      setIsNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperator = (op) => {
    setEquation(`${display} ${op} `);
    setHistory(prev => [...prev, display, op]);
    setIsNewNumber(true);
  };

  const calculate = () => {
    try {
      // Basic safe evaluation for standard operators
      // Note: For a production app, consider a dedicated math parser, 
      // but for basic arithmetic, this controlled execution is acceptable.
      const fullEquation = equation + display;
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${fullEquation.replace(/[^-()\d/*+.]/g, '')}`)();
      
      const formattedResult = parseFloat(result.toFixed(2));
      setDisplay(String(formattedResult));
      setEquation('');
      setHistory([]);
      setIsNewNumber(true);
      return formattedResult;
    } catch (e) {
      setDisplay('Error');
      setIsNewNumber(true);
      return 0;
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setHistory([]);
    setIsNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setIsNewNumber(true);
    }
  };

  const applyMarkup = (percentage) => {
    if (!referencePrice) return;
    const cost = parseFloat(referencePrice);
    const selling = cost + (cost * (percentage / 100));
    setDisplay(String(selling.toFixed(2)));
    setIsNewNumber(true);
  };

  const handleApply = () => {
    // If there is a pending calculation, calculate it first
    let finalValue = parseFloat(display);
    if (equation) {
      finalValue = calculate();
    }
    onApply(finalValue);
    onClose?.();
  };

  return (
    <div className="w-[320px] bg-background border rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Display Area */}
      <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b">
        <div className="h-6 text-xs text-muted-foreground text-right font-mono overflow-hidden">
          {equation || (referencePrice > 0 ? `Cost: ${formatPrice(referencePrice)}` : '')}
        </div>
        <div className="text-3xl font-bold text-right tracking-tight font-mono overflow-hidden text-slate-900 dark:text-slate-100">
          {display}
        </div>
        
        {referencePrice > 0 && (
          <div className="mt-2 flex gap-1 justify-end flex-wrap">
            {markups.map(m => (
               <button
                 key={m}
                 onClick={() => applyMarkup(m)}
                 className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-full transition-colors"
               >
                 +{m}%
               </button>
            ))}
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="p-2 grid grid-cols-4 gap-2 bg-white dark:bg-slate-950">
        <Button variant="ghost" onClick={handleClear} className="text-red-500 hover:text-red-600 hover:bg-red-50">AC</Button>
        <Button variant="ghost" onClick={handleBackspace}><DeleteIcon className="h-4 w-4" /></Button>
        <Button variant="secondary" onClick={() => handleOperator('/')} className="text-indigo-600 font-bold">÷</Button>
        <Button variant="secondary" onClick={() => handleOperator('*')} className="text-indigo-600 font-bold">×</Button>

        {['7', '8', '9'].map(n => (
          <Button key={n} variant="outline" onClick={() => handleNumber(n)} className="text-lg font-medium">{n}</Button>
        ))}
        <Button variant="secondary" onClick={() => handleOperator('-')} className="text-indigo-600 font-bold">−</Button>

        {['4', '5', '6'].map(n => (
          <Button key={n} variant="outline" onClick={() => handleNumber(n)} className="text-lg font-medium">{n}</Button>
        ))}
        <Button variant="secondary" onClick={() => handleOperator('+')} className="text-indigo-600 font-bold">+</Button>

        {['1', '2', '3'].map(n => (
          <Button key={n} variant="outline" onClick={() => handleNumber(n)} className="text-lg font-medium">{n}</Button>
        ))}
        <Button variant="default" onClick={calculate} className="row-span-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">=</Button>

        <Button variant="outline" onClick={() => handleNumber(0)} className="col-span-2 text-lg font-medium">0</Button>
        <Button variant="outline" onClick={handleDecimal} className="text-lg font-medium">.</Button>
      </div>

      {/* Actions */}
      <div className="p-3 border-t bg-slate-50 dark:bg-slate-900 flex justify-between gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
           Cancel
        </Button>
        <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleApply}>
           <Check className="mr-2 h-3 w-3" /> Apply Price
        </Button>
      </div>
    </div>
  );
};

export default Calculator;