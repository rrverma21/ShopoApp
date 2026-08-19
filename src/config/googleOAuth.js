const getEnvVar = (key) => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`[OAuth Config] Missing environment variable: ${key}`);
  }
  return value;
};

export const googleOAuthConfig = {
  clientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
  redirectUri: getEnvVar('VITE_GOOGLE_REDIRECT_URI'), 
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ].join(' ')
};

export const validateOAuthConfig = () => {
  const errors = [];
  const warnings = [];
  const clientId = googleOAuthConfig.clientId || '';
  const redirectUri = googleOAuthConfig.redirectUri || '';

  console.group('OAuth Config Validation');

  // Check Client ID
  if (!clientId) {
    errors.push("VITE_GOOGLE_CLIENT_ID is missing or empty.");
  } else {
    if (clientId.includes(' ')) {
      errors.push("VITE_GOOGLE_CLIENT_ID contains spaces.");
    }
    if (clientId.includes('your_google_client_id')) {
      errors.push("VITE_GOOGLE_CLIENT_ID is set to the placeholder value.");
    }
    if (!clientId.endsWith('.apps.googleusercontent.com')) {
      warnings.push("VITE_GOOGLE_CLIENT_ID format looks unusual (expected to end with .apps.googleusercontent.com).");
    }
  }

  // Check Redirect URI
  if (!redirectUri) {
    errors.push("VITE_GOOGLE_REDIRECT_URI is missing or empty.");
  } else {
    if (redirectUri.endsWith('/')) {
      errors.push("VITE_GOOGLE_REDIRECT_URI has a trailing slash. Google requires exact match without trailing slash.");
    }
    try {
      new URL(redirectUri); 
    } catch (e) {
      errors.push(`VITE_GOOGLE_REDIRECT_URI is not a valid URL: ${redirectUri}`);
    }
  }

  // Check Scopes
  if (!googleOAuthConfig.scopes || !googleOAuthConfig.scopes.includes('openid')) {
    warnings.push("Scopes might be missing 'openid'.");
  }

  if (errors.length > 0) {
    console.error('Validation Errors:', errors);
  } else {
    console.log('Validation Passed');
  }
  
  if (warnings.length > 0) {
    console.warn('Validation Warnings:', warnings);
  }

  console.groupEnd();

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      ...googleOAuthConfig,
      clientId: clientId ? `${clientId.substring(0, 15)}...` : 'missing',
      fullClientId: clientId,
      fullRedirectUri: redirectUri
    }
  };
};