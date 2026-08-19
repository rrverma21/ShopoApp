import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, Calculator as CalcIcon } from 'lucide-react';
import CalculatorButton from './CalculatorButton';
import { cn } from '@/lib/utils';

const FloatingCalculator = ({ isOpen, onClose }) => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeKey, setActiveKey] = useState(null);

  // Helper to safely evaluate expression
  const evaluateExpression = (expr) => {
    try {
      // Replace visual operators with JS operators
      const evalString = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/%/g, '/100')
        .replace(/−/g, '-'); // Handle minus visual variant if present, though we use standard hyphen usually
      
      // Basic safety check - only allow numbers and math operators
      if (/[^0-9+\-*/().\s]/.test(evalString)) return '';
      
      // Evaluate
      // eslint-disable-next-line no-new-func
      const res = new Function(`return ${evalString}`)();
      
      // Format result
      if (!isFinite(res) || isNaN(res)) return 'Error';
      
      // Format decimal places if needed
      return Number.isInteger(res) ? res.toString() : res.toFixed(2).replace(/\.?0+$/, '');
    } catch (error) {
      return '';
    }
  };

  const handleInput = useCallback((val) => {
    setExpression((prev) => {
        const lastChar = prev.slice(-1);
        const operators = ['+', '-', '×', '÷', '%'];
        
        // Prevent multiple decimals in the current number
        if (val === '.') {
            const parts = prev.split(/[\+\-\×\÷\%]/);
            const currentNumber = parts[parts.length - 1];
            if (currentNumber.includes('.')) {
                return prev;
            }
        }

        // Prevent multiple operators in a row (replace logic)
        if (operators.includes(val)) {
             if (operators.includes(lastChar)) {
                 // Replace the last operator with the new one
                 return prev.slice(0, -1) + val;
             }
             if (lastChar === '.') {
                 // If last char was decimal, replace it with operator
                 return prev.slice(0, -1) + val; 
             }
             if (prev === '') {
                 // Prevent starting with operator (except minus which acts as negative)
                 if (val === '-') return val;
                 return prev;
             }
        }
        
        return prev + val;
    });
  }, []);

  const handleClear = useCallback(() => {
    setExpression('');
    setResult('');
  }, []);

  const handleBackspace = useCallback(() => {
    setExpression(prev => prev.slice(0, -1));
  }, []);

  const handleEquals = useCallback(() => {
    if (!expression) return;
    const finalRes = evaluateExpression(expression);
    if (finalRes && finalRes !== 'Error') {
        setExpression(finalRes.toString());
        setResult('');
    }
  }, [expression]);

  // Effect to update result whenever expression changes
  useEffect(() => {
      const operators = ['+', '-', '×', '÷', '%', '.'];
      const lastChar = expression.slice(-1);
      
      // Only calculate if the expression ends with a number or percentage
      // and isn't just an empty string
      if (expression && !operators.includes(lastChar)) {
          const tempRes = evaluateExpression(expression);
          if (tempRes && tempRes !== 'Error') {
              setResult(tempRes);
          }
      } else if (!expression) {
          setResult('');
      }
  }, [expression]);

  // Keyboard Event Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
        const key = e.key;
        let actionKey = null;

        if (key >= '0' && key <= '9') {
            handleInput(key);
            actionKey = key;
        } else if (key === '.') {
            handleInput('.');
            actionKey = '.';
        } else if (key === '+') {
            handleInput('+');
            actionKey = '+';
        } else if (key === '-') {
            handleInput('-');
            actionKey = '-';
        } else if (key === '*') {
            handleInput('×');
            actionKey = '×';
        } else if (key === '/') {
            e.preventDefault(); // Prevent browser quick search
            handleInput('÷');
            actionKey = '÷';
        } else if (key === '%') {
            handleInput('%');
            actionKey = '%';
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleEquals();
            actionKey = '=';
        } else if (key === 'Backspace') {
            handleBackspace();
            actionKey = 'backspace';
        } else if (key === 'Escape') {
            handleClear();
            actionKey = 'AC';
        }

        if (actionKey) {
            setActiveKey(actionKey);
            setTimeout(() => setActiveKey(null), 150);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleInput, handleEquals, handleBackspace, handleClear]);

  const handleDragEnd = (event, info) => {
    // Optional: Snap to edges logic could go here
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          drag
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          className={cn(
            "fixed z-50 bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl",
            isMinimized ? "w-auto h-auto rounded-full bottom-24 right-6 p-0" : "w-[340px] bottom-24 right-6"
          )}
          style={{ touchAction: 'none' }} // Prevents page scroll on mobile while dragging
        >
          {isMinimized ? (
             <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMinimized(false)}
                className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-600 transition-colors"
             >
                <CalcIcon className="w-8 h-8" />
             </motion.button>
          ) : (
            <>
              {/* Header / Drag Handle */}
              <div className="flex items-center justify-between p-4 bg-gray-900/50 cursor-move border-b border-gray-800">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsMinimized(true)}
                        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" 
                        title="Minimize"
                    />
                    <button 
                        onClick={onClose}
                        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" 
                        title="Close"
                    />
                </div>
                <div className="text-gray-500 text-xs font-medium flex items-center gap-1">
                    <CalcIcon className="w-3 h-3" />
                    CALCULATOR
                </div>
              </div>

              {/* Display */}
              <div className="p-6 pb-2 text-right">
                <div className="text-gray-400 text-lg min-h-[1.75rem] font-light tracking-wide break-all">
                  {expression || '0'}
                </div>
                <div className="text-white text-4xl font-bold mt-1 tracking-wider min-h-[3rem]">
                  {result || (expression ? '=' : '')}
                </div>
              </div>

              {/* Keypad */}
              <div className="p-5 grid grid-cols-4 gap-3 bg-gray-900">
                <CalculatorButton 
                    onClick={handleClear} 
                    variant="secondary" 
                    className={cn("text-orange-400 font-bold", activeKey === 'AC' && "bg-gray-600")}
                >
                    AC
                </CalculatorButton>
                <CalculatorButton 
                    onClick={() => handleInput('%')} 
                    variant="secondary" 
                    className={cn("text-gray-300", activeKey === '%' && "bg-gray-600")}
                >
                    %
                </CalculatorButton>
                <CalculatorButton 
                    onClick={handleBackspace} 
                    variant="secondary" 
                    className={cn("text-gray-300", activeKey === 'backspace' && "bg-gray-600")}
                >
                    <Delete className="w-6 h-6" />
                </CalculatorButton>
                <CalculatorButton 
                    onClick={() => handleInput('÷')} 
                    variant="secondary" 
                    className={cn("bg-gray-800 text-gray-300 text-3xl pb-1", activeKey === '÷' && "bg-gray-600")}
                >
                    ÷
                </CalculatorButton>

                <CalculatorButton onClick={() => handleInput('7')} className={activeKey === '7' && "ring-2 ring-white"}>7</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('8')} className={activeKey === '8' && "ring-2 ring-white"}>8</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('9')} className={activeKey === '9' && "ring-2 ring-white"}>9</CalculatorButton>
                <CalculatorButton 
                    onClick={() => handleInput('×')} 
                    variant="secondary" 
                    className={cn("bg-gray-800 text-gray-300 text-2xl pb-1", activeKey === '×' && "bg-gray-600")}
                >
                    ×
                </CalculatorButton>

                <CalculatorButton onClick={() => handleInput('4')} className={activeKey === '4' && "ring-2 ring-white"}>4</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('5')} className={activeKey === '5' && "ring-2 ring-white"}>5</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('6')} className={activeKey === '6' && "ring-2 ring-white"}>6</CalculatorButton>
                <CalculatorButton 
                    onClick={() => handleInput('-')} 
                    variant="secondary" 
                    className={cn("bg-gray-800 text-gray-300 text-3xl pb-1", activeKey === '-' && "bg-gray-600")}
                >
                    −
                </CalculatorButton>

                <CalculatorButton onClick={() => handleInput('1')} className={activeKey === '1' && "ring-2 ring-white"}>1</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('2')} className={activeKey === '2' && "ring-2 ring-white"}>2</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('3')} className={activeKey === '3' && "ring-2 ring-white"}>3</CalculatorButton>
                <CalculatorButton 
                    onClick={() => handleInput('+')} 
                    variant="secondary" 
                    className={cn("bg-gray-800 text-gray-300 text-3xl pb-1", activeKey === '+' && "bg-gray-600")}
                >
                    +
                </CalculatorButton>

                <CalculatorButton onClick={() => handleInput('00')} className="text-lg">00</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('0')} className={activeKey === '0' && "ring-2 ring-white"}>0</CalculatorButton>
                <CalculatorButton onClick={() => handleInput('.')} className={activeKey === '.' && "ring-2 ring-white"}>.</CalculatorButton>
                <CalculatorButton 
                    onClick={handleEquals} 
                    variant="orange" 
                    className={cn("text-3xl pb-1", activeKey === '=' && "bg-orange-600 ring-2 ring-orange-300")}
                >
                    =
                </CalculatorButton>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCalculator;