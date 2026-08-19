/*
-- Sample SQL for creating policies (run in SQL editor):
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON referrals;
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view their own rewards" ON referral_rewards;
DROP POLICY IF EXISTS "Admins can manage all rewards" ON referral_rewards;
CREATE POLICY "Users can view their own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);
CREATE POLICY "Admins can manage all referrals" ON referrals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authenticated users can insert referrals" ON referrals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can view their own rewards" ON referral_rewards FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can manage all rewards" ON referral_rewards FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
*/

import { supabase } from '@/lib/customSupabaseClient';

export async function getReferrerByCode(referralCode) {
  const { data, error } = await supabase
    .from('referrals')
    .select('referrer_id')
    .eq('referral_code', referralCode)
    .eq('status', 'pending')
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data?.referrer_id || null;
}

export async function createReferralLinkage(referrerUserId, referredUserId, referralCode) {
  const { data, error } = await supabase
    .from('referrals')
    .update({
      referred_user_id: referredUserId,
      status: 'successful',
      completed_at: new Date().toISOString()
    })
    .eq('referral_code', referralCode)
    .eq('referrer_id', referrerUserId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReferralStats(userId) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    if (error) throw error;

    const total = data.length;
    const successful = data.filter(r => r.status === 'successful').length;
    const pending = data.filter(r => r.status === 'pending').length;
    const earnings = data.reduce((acc, curr) => acc + (parseFloat(curr.reward_amount) || 0), 0);
    const conversionRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

    return { success: true, data: { total, successful, pending, earnings, conversionRate } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getReferralHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createReferral(referrerId, referralCode, referredUserId) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .insert([
        {
          referrer_id: referrerId,
          referred_user_id: referredUserId,
          referral_code: referralCode,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateReferralStatus(referralId, status) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .update({ status, completed_at: status === 'successful' ? new Date().toISOString() : null })
      .eq('id', referralId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}