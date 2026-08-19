import { supabase as customClient } from './customSupabaseClient';

// Centralized Supabase Client Configuration
// To avoid duplicate or conflicting instances (which causes binding mismatches),
// we strictly reuse the verified instance from customSupabaseClient.js.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust Environment Variable Validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables. Check .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
} else {
  try {
    new URL(supabaseUrl); // Validate URL format
  } catch (e) {
    console.error('CRITICAL: VITE_SUPABASE_URL is not a valid URL format:', supabaseUrl);
  }
}

// Expose single instance to prevent duplicate socket connections
export const supabase = customClient;

// Bootstrap storage - Call Edge Function to create/verify 'blog-images' bucket safely
export const initializeStorage = async () => {
  try {
    console.log('[Supabase Storage] Invoking "create-blog-images-bucket" edge function...');
    
    const { data, error } = await supabase.functions.invoke('create-blog-images-bucket');
    
    if (error) {
      console.error('[Supabase Storage] Edge Function invocation failed:', error);
      throw error;
    }

    if (!data?.success) {
      console.error('[Supabase Storage] Edge Function reported failure:', data?.error);
      throw new Error(data?.error || 'Failed to initialize storage bucket via Edge Function');
    }

    console.log('[Supabase Storage] Storage bucket verified/created successfully:', data.message);
    return { success: true, message: data.message };
  } catch (err) {
    console.error('[Supabase Storage] Error initializing storage:', err.message);
    return { success: false, error: err.message };
  }
};

// Helper to manually check connection stability and recover if necessary
export const checkSupabaseConnection = async () => {
  try {
    // A lightweight query to verify active connectivity
    const { error } = await supabase.from('site_settings').select('key').limit(1);
    if (error) {
      throw error;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Connection health check failed:', err.message);
    // In a severe mismatch/disconnect, forcing a reconnect via auth refresh may help
    try {
      await supabase.auth.refreshSession();
    } catch (refreshErr) {
      console.error('[Supabase] Session refresh recovery failed:', refreshErr.message);
    }
    return false;
  }
};

// Debug helper
if (import.meta.env.DEV) {
  window.supabase = supabase;
}

export default supabase;