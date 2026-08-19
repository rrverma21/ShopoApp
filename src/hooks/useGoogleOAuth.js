import { useState } from 'react';
import { initiateGoogleLogin, clearAuthStorage } from '@/services/googleOAuthService';
import { supabase } from '@/lib/supabaseClient';
import { googleOAuthConfig } from '@/config/googleOAuth';

export const useGoogleOAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    console.log('[useGoogleOAuth] loginWithGoogle called');
    
    try {
      const authUrl = await initiateGoogleLogin();
      
      console.log('[useGoogleOAuth] Redirecting to Google Auth URL:', authUrl);
      window.location.href = authUrl;
    } catch (err) {
      console.error('[useGoogleOAuth] Google Login Init Error:', err);
      setError('Failed to initialize Google login: ' + err.message);
      setLoading(false);
    }
  };

  const handleCallback = async () => {
    setLoading(true);
    setError(null);
    console.log('[useGoogleOAuth] Handling OAuth Callback');
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = localStorage.getItem('google_auth_state');
    const codeVerifier = localStorage.getItem('google_auth_code_verifier');

    console.log('[useGoogleOAuth] Callback Params:', { code: code ? 'Present' : 'Missing', state });
    console.log('[useGoogleOAuth] Stored State:', storedState);

    if (!code) {
      const errorMsg = 'No authorization code found in URL parameters';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return null;
    }

    if (state !== storedState) {
      const errorMsg = 'Invalid state parameter. Possible CSRF attack or state mismatch.';
      console.error(errorMsg, { received: state, stored: storedState });
      setError(errorMsg);
      setLoading(false);
      clearAuthStorage();
      return null;
    }

    try {
      console.log('[useGoogleOAuth] Invoking google-oauth-callback Edge Function');
      // Call Edge Function to exchange code
      const { data, error: fnError } = await supabase.functions.invoke('google-oauth-callback', {
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: googleOAuthConfig.redirectUri
        })
      });

      if (fnError) {
        console.error('[useGoogleOAuth] Edge Function Error:', fnError);
        throw fnError;
      }
      
      if (!data.success) {
        console.error('[useGoogleOAuth] Edge Function returned failure:', data);
        throw new Error(data.error || 'Login failed during token exchange');
      }

      console.log('[useGoogleOAuth] Token exchange successful, signing in with Supabase');

      // Use the returned ID token to sign in with Supabase properly
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: data.id_token,
      });

      if (authError) {
        console.error('[useGoogleOAuth] Supabase signInWithIdToken Error:', authError);
        throw authError;
      }

      console.log('[useGoogleOAuth] Sign in successful');
      clearAuthStorage();
      setLoading(false);
      return authData.user;

    } catch (err) {
      console.error('[useGoogleOAuth] Google Callback Final Error:', err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
      return null;
    }
  };

  return {
    loginWithGoogle,
    handleCallback,
    loading,
    error
  };
};