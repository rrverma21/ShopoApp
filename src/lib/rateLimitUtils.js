/**
 * Client-side rate limiting utility.
 * Note: Actual enforcement happens on the backend (Edge Functions).
 * This provides immediate UI feedback to prevent unnecessary API calls.
 */
const rateLimits = new Map();

export const checkRateLimit = (key, maxAttempts, windowSeconds) => {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { attempts: 1, firstAttemptTime: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
  }
  
  const limitData = rateLimits.get(key);
  
  if (now - limitData.firstAttemptTime > windowMs) {
    rateLimits.set(key, { attempts: 1, firstAttemptTime: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
  }
  
  if (limitData.attempts >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0, resetTime: limitData.firstAttemptTime + windowMs };
  }
  
  limitData.attempts += 1;
  return { 
    allowed: true, 
    remainingAttempts: maxAttempts - limitData.attempts, 
    resetTime: limitData.firstAttemptTime + windowMs 
  };
};