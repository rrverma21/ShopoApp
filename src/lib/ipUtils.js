/**
 * Extracts client IP address from request headers or connection object.
 * Note: In frontend code, this mostly relies on third-party services as the browser doesn't know its public IP.
 * This utility provides standard logic which is mirrored in Edge Functions.
 */
export const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn("Failed to fetch client IP, falling back to unknown");
    return "0.0.0.0";
  }
};