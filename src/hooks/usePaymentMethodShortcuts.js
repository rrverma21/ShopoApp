import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle payment method keyboard shortcuts (F8-F12)
 * @param {boolean} isEnabled - Whether shortcuts should be active
 * @param {function} onSelect - Callback function when a method is selected
 */
const usePaymentMethodShortcuts = (isEnabled, onSelect) => {
  // Use a ref for the callback to prevent effect re-execution on every render
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    console.log(`[usePaymentMethodShortcuts] Hook mounted/updated. Enabled: ${isEnabled}`);

    const handleKeyDown = (e) => {
      // 1. Context Awareness: Check if shortcuts should be active
      if (!isEnabled) return;

      // 2. Input Safety: Don't trigger if user is typing in a form field
      const activeTag = document.activeElement?.tagName?.toUpperCase();
      const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
      
      if (isInputActive) return;

      // 3. Key Mapping: Map F8-F12 to payment methods
      let method = null;
      
      switch (e.key) {
        case 'F12': method = 'Cash'; break;
        case 'F11': method = 'UPI'; break;
        case 'F10': method = 'Split'; break;
        case 'F9':  method = 'Credit'; break;
        case 'F8':  method = 'Card'; break;
        default: return;
      }

      // 4. Execution
      if (method) {
        console.log(`[usePaymentMethodShortcuts] ⚡ Shortcut DETECTED: ${method} (Key: ${e.key})`);
        e.preventDefault();
        e.stopPropagation(); // Prevent default browser behavior (e.g., F12 dev tools, F11 fullscreen)
        
        try {
            console.log(`[usePaymentMethodShortcuts] Triggering onSelect callback for: ${method}`);
            onSelectRef.current(method);
        } catch (err) {
            console.error('[usePaymentMethodShortcuts] ❌ Error in onSelect callback:', err);
        }
      }
    };

    // Attach listener to window to catch events globally
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled]); // Only re-attach if enabled state changes
};

export default usePaymentMethodShortcuts;