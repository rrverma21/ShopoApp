import { useEffect } from 'react';

/**
 * Custom hook to handle quantity adjustments via keyboard shortcuts (+ and -)
 * 
 * @param {Function} onIncrease - Callback to run when + is pressed
 * @param {Function} onDecrease - Callback to run when - is pressed
 * @param {boolean} enabled - Whether shortcuts are active (default: true)
 */
const useQuantityKeyboardShortcuts = (onIncrease, onDecrease, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // 1. Safety Check: Modals & Overlays
      // Check for open dialogs from shadcn/ui or typical overlays to ensure we don't trigger actions when a modal is focused
      const isModalOpen = 
        document.querySelector('[role="dialog"][data-state="open"]') || 
        document.querySelector('[data-state="open"] .fixed.inset-0');
      
      if (isModalOpen) return;

      // 2. Safety Check: Barcode Scanner
      // Check for active video element (camera feed) which indicates scanner is running
      const isScannerActive = document.querySelector('video');
      if (isScannerActive) return;

      const target = event.target;
      const tagName = target.tagName;
      
      const isInput = 
        tagName === 'INPUT' || 
        tagName === 'TEXTAREA' || 
        target.isContentEditable;

      if (isInput) {
        const type = target.getAttribute('type');
        const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
        const id = (target.getAttribute('id') || '').toLowerCase();
        const className = (target.getAttribute('class') || '').toLowerCase();

        // Rule 1: Always BLOCK shortcuts for Quantity/Number inputs
        // This ensures users can type numbers naturally
        const isQuantityInput = 
          type === 'number' || 
          id.includes('quantity') || 
          className.includes('quantity');

        if (isQuantityInput) return;

        // Rule 2: ALLOW shortcuts for Search inputs
        // Matches by id, class, or placeholder containing 'search'
        const isSearchInput = 
          placeholder.includes('search') || 
          id.includes('search') || 
          className.includes('search');

        // Rule 3: BLOCK shortcuts for all other inputs (Name, Notes, Address, etc.)
        if (!isSearchInput) return;
        
        // If we reach here, it's a Search Input, so we allow the shortcut to proceed.
      }

      // Check for Plus keys: "+" (Shift+=), "=", or NumpadAdd
      if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
        event.preventDefault();
        onIncrease();
      }

      // Check for Minus keys: "-", "_", or NumpadSubtract
      if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        onDecrease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onIncrease, onDecrease, enabled]);
};

export default useQuantityKeyboardShortcuts;