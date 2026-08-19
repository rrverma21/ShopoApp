import { supabase } from '@/lib/customSupabaseClient';

/**
 * Frontend Audit Logger Wrapper.
 * Forwards audit events to the backend safely.
 */
export const logOTPEvent = async (email, phoneNumber, action, status, ipAddress, errorMessage = null, attemptCount = null) => {
  try {
    await supabase.from('otp_audit_logs').insert([{
      email,
      phone_number: phoneNumber,
      action,
      status,
      ip_address: ipAddress,
      error_message: errorMessage,
      attempt_count: attemptCount
    }]);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};