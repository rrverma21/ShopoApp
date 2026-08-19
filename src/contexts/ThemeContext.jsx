import React, { createContext, useContext, useEffect } from 'react';

// Create context with default values for 'light' theme
export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Enforce light theme on mount and cleanup any dark theme classes/storage
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove dark class if present
    root.classList.remove('dark');
    // Ensure light class is present
    root.classList.add('light');
    
    // Force local storage to light to prevent persistence of dark mode
    localStorage.setItem('theme', 'light');
  }, []);

  // Always provide 'light' value and a no-op toggle function
  const value = {
    theme: 'light',
    toggleTheme: () => {
      // No-op: Dark mode is disabled
    },
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};