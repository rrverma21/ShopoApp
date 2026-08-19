import { googleOAuthConfig } from '@/config/googleOAuth';

// Generate a random string for the state and code verifier
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Generate Code Challenge from Verifier (SHA-256)
const generateCodeChallenge = async (codeVerifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const initiateGoogleLogin = async () => {
  const timestamp = new Date().toISOString();
  console.group(`Google OAuth Initiation [${timestamp}]`);
  
  try {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    // Detailed Parameter Logging
    console.log('%c OAuth Configuration Parameters', 'color: #2563eb; font-weight: bold;');
    console.table({
      'Client ID': googleOAuthConfig.clientId || 'MISSING',
      'Redirect URI': googleOAuthConfig.redirectUri || 'MISSING',
      'Scopes': googleOAuthConfig.scopes,
      'State': state,
      'PKCE Verifier': codeVerifier,
      'PKCE Challenge': codeChallenge,
      'PKCE Method': 'S256'
    });
    
    // Check for critical missing config
    if (!googleOAuthConfig.clientId) console.error('CRITICAL: Client ID is missing!');
    if (!googleOAuthConfig.redirectUri) console.error('CRITICAL: Redirect URI is missing!');
    
    // Check for common redirect URI mistakes
    if (googleOAuthConfig.redirectUri && googleOAuthConfig.redirectUri.endsWith('/')) {
        console.warn('WARNING: Redirect URI ends with a slash. Google typically requires exact matching without trailing slashes.');
    }

    // Store verifier and state in localStorage to verify on callback
    localStorage.setItem('google_auth_code_verifier', codeVerifier);
    localStorage.setItem('google_auth_state', state);
    console.log('Stored PKCE verifier and State in localStorage');

    const params = new URLSearchParams({
      client_id: googleOAuthConfig.clientId,
      redirect_uri: googleOAuthConfig.redirectUri,
      response_type: 'code',
      scope: googleOAuthConfig.scopes,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline', 
      prompt: 'consent',
      include_granted_scopes: 'true'
    });

    const authUrl = `${googleOAuthConfig.authUrl}?${params.toString()}`;
    
    console.log('%c GENERATED AUTHORIZATION URL:', 'color: #16a34a; font-weight: bold;');
    console.log(authUrl);
    
    console.groupEnd();
    
    return authUrl;
  } catch (error) {
    console.error('Error initiating Google Login:', error);
    console.groupEnd();
    throw error;
  }
};

export const clearAuthStorage = () => {
  console.log('Clearing OAuth storage artifacts...');
  localStorage.removeItem('google_auth_code_verifier');
  localStorage.removeItem('google_auth_state');
};