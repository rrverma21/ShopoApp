import React, { createContext, useState, useContext, useEffect } from 'react';
import { getRegionConfig } from '@/utils/regionConfig';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { setGlobalCurrency, getValidCurrencySymbol, getCurrencyCodeByCountry } from '@/lib/utils';

const RegionContext = createContext();

export const RegionProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentRegion, setRegionState] = useState('India');
  const [currency, setCurrency] = useState({ country: 'India', code: 'INR', symbol: '₹' });
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);

  // Persistence Test Logic:
  // On every initial mount or login, this fetches the user's settings,
  // maps the raw string to a guaranteed strict symbol, and passes it into global state.
  // Because 'S$' is strictly stripped down to '$' for USD countries within utils logic,
  // a refresh will permanently scrub bad prefix data from rendering into the UI.
  useEffect(() => {
    let isMounted = true;
    
    const fetchSettings = async () => {
      if (!user) {
        if (isMounted) {
           // Fallback to default when logged out
           setGlobalCurrency('India', '₹');
           setCurrency({ country: 'India', code: 'INR', symbol: '₹' });
           setIsLoadingCurrency(false);
        }
        return;
      }
      
      setIsLoadingCurrency(true);
      try {
        const { data, error } = await supabase
          .from('pos_retailer_settings')
          .select('country, currency')
          .eq('user_id', user.id)
          .maybeSingle();

        if (isMounted) {
            if (data && data.country) {
              const countryName = data.country;
              const code = getCurrencyCodeByCountry(countryName);
              
              // Set strict standard defaults based on ISO code
              let defaultSymbol = '$';
              if (code === 'GBP') defaultSymbol = '£';
              if (code === 'INR') defaultSymbol = '₹';
              if (code === 'EUR') defaultSymbol = '€';
              
              // Map raw DB string to proper symbol (removes US$, S$ noise via utils hook)
              const rawCurrencyStr = data.currency || defaultSymbol;
              let mappedSymbol = getValidCurrencySymbol(rawCurrencyStr, defaultSymbol);
              
              // Hard-force USD mappings to pure $
              if (code === 'USD' && (mappedSymbol === 'S$' || mappedSymbol === 'US$')) {
                  mappedSymbol = '$';
              }
              
              setRegionState(countryName);
              
              setCurrency({
                country: countryName,
                code: code,
                symbol: mappedSymbol
              });
              
              // Persist to global context to enable robust formatting everywhere
              setGlobalCurrency(countryName, mappedSymbol);
            } else {
              // Defaults if user lacks specific settings
              setGlobalCurrency('India', '₹');
              setCurrency({ country: 'India', code: 'INR', symbol: '₹' });
            }
        }
      } catch (err) {
        console.error("Error fetching currency settings:", err);
        if (isMounted) {
          setGlobalCurrency('India', '₹');
          setCurrency({ country: 'India', code: 'INR', symbol: '₹' });
        }
      } finally {
        if (isMounted) setIsLoadingCurrency(false);
      }
    };

    fetchSettings();
    
    return () => { isMounted = false; };
  }, [user]);

  const setRegion = async (newCountry, newSymbol) => {
    // Treat undefined country as USA baseline
    const country = newCountry || 'USA';
    const code = getCurrencyCodeByCountry(country);
    
    let defaultSym = '$';
    if (code === 'GBP') defaultSym = '£';
    if (code === 'INR') defaultSym = '₹';
    if (code === 'EUR') defaultSym = '€';
    
    // Ensure we are passing a valid symbol to state, mapping it just in case
    let mappedSymbol = getValidCurrencySymbol(newSymbol, defaultSym);
    
    // Hard-force USD mappings to pure $
    if (code === 'USD' && (mappedSymbol === 'S$' || mappedSymbol === 'US$')) {
        mappedSymbol = '$';
    }
    
    setRegionState(country);
    localStorage.setItem('selectedRegion', country.toLowerCase());
    
    setCurrency({ country, code, symbol: mappedSymbol });
    setGlobalCurrency(country, mappedSymbol);
    
    // Persist immediately if user is authenticated
    if (user) {
       try {
           // We store the mapped symbol securely in the database
           await supabase.from('pos_retailer_settings')
             .update({ country: country, currency: mappedSymbol })
             .eq('user_id', user.id);
       } catch (err) {
           console.error("Failed to persist currency/region:", err);
       }
    }
  };

  const getCurrentRegion = () => currentRegion;

  let regionConfig = {};
  try {
    if (typeof getRegionConfig === 'function') {
      regionConfig = getRegionConfig(currentRegion);
    }
  } catch (error) {
    console.warn('Could not load region config:', error);
  }

  return (
    <RegionContext.Provider value={{ 
        currentRegion, 
        setRegion, 
        getCurrentRegion, 
        regionConfig,
        currency,
        isLoadingCurrency 
    }}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => useContext(RegionContext);