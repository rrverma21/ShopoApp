import { supabase } from '@/lib/customSupabaseClient';

/**
 * Frontend SMS Service Wrapper.
 * The actual MSG91 API calls are made securely from Supabase Edge Functions.
 * This file provides the frontend interface to trigger those backend functions.
 */

export const sendOTPSMS = async (phoneNumber, otpType = 'sms', ipAddress = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('seller-registration-resend-otp', {
      body: { 
        phoneNumber,
        otpType,
        ipAddress: ipAddress || '0.0.0.0'
      }
    });

    if (error) throw error;
    return { success: true, ...data };
  } catch (error) {
    console.error('SMS Service Error:', error);
    return { success: false, error: error.message };
  }
};