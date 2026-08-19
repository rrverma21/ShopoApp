import { supabase } from '@/lib/supabaseClient';

/**
 * Generates a unique alphanumeric referral code (e.g., SHOP12ABC)
 * Note: Database triggers automatically handle this on profile creation.
 * This utility is for manual generation if needed.
 */
export const generateUniqueReferralCode = async () => {
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    code = `SHOP${randomStr}`;

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking referral code uniqueness:', error);
      throw error;
    }

    if (!data) {
      isUnique = true;
    }
  }

  return code;
};