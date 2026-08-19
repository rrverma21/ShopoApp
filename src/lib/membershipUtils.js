import { supabase } from './supabaseClient';

/**
 * MEMBERSHIP DURATION LOGIC:
 * - duration_days = 0: Unlimited/lifetime plan (e.g., FREE STARTER)
 * - duration_days > 0: Limited plan expires after N days
 * - membership_end_date = NULL: Plan never expires (unlimited)
 * - membership_end_date = future date: Plan expires on that date
 */

/**
 * Check if a membership plan is unlimited (never expires)
 * @param {Object} plan - Membership plan object with duration_days property
 * @returns {boolean} - True if plan is unlimited (duration_days = 0)
 */
export function isPlanUnlimited(plan) {
  if (!plan) return false;
  
  // CRITICAL: duration_days = 0 means unlimited/lifetime access
  return plan.duration_days === 0 || plan.duration_days === null;
}

/**
 * Check if a plan is a free plan
 * @param {Object} plan - Membership plan object
 * @returns {boolean} - True if plan is free (price = 0)
 */
export function isFreePlan(plan) {
  if (!plan) return false;
  
  return (
    plan.price === 0 ||
    plan.price_monthly === 0 ||
    (plan.name && (
      plan.name.toLowerCase().includes('free') ||
      plan.name.toLowerCase().includes('trial') ||
      plan.name.toLowerCase().includes('starter')
    ))
  );
}

/**
 * Get active membership for a user
 * Handles both limited and unlimited plans correctly
 */
export async function getActiveMembership(userId) {
  if (!userId) return null;
  
  const now = new Date().toISOString();
  
  // Query for active memberships that:
  // 1. Have status = 'active'
  // 2. Either have no end date (unlimited) OR end date is in the future
  const { data, error } = await supabase
    .from('user_memberships')
    .select(`
      *,
      plan:membership_plans!user_memberships_membership_plan_id_fkey(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .or(`end_date.gt.${now},end_date.is.null`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active membership:', error);
    throw error;
  }
  
  return data;
}

/**
 * Calculate membership end date based on plan duration
 * UPDATED: Properly handles duration_days = 0 as unlimited
 * 
 * @param {string|Date} startDate - Membership start date
 * @param {Object} plan - Membership plan with duration_days property
 * @returns {string|null} - ISO date string or null for unlimited plans
 */
export function calculateMembershipEndDate(startDate, plan) {
  if (!plan) return null;
  
  // CRITICAL: duration_days = 0 means unlimited
  if (plan.duration_days === 0) {
    return null; // Unlimited plan never expires
  }
  
  const date = new Date(startDate);
  const daysToAdd = plan.duration_days || 30; // Fallback to 30 if undefined
  
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString();
}

/**
 * Calculate membership end date based on billing cycle (legacy function)
 * DEPRECATED: Use calculateMembershipEndDate(startDate, plan) instead
 * 
 * @param {string|Date} startDate - Membership start date
 * @param {string} billingCycle - 'monthly', 'yearly', or 'lifetime'
 * @returns {string|null} - ISO date string or null for lifetime plans
 */
export function calculateMembershipEndDateLegacy(startDate, billingCycle) {
  if (!billingCycle) return null;
  
  const cycle = billingCycle.toLowerCase();
  const date = new Date(startDate);
  
  if (cycle === 'monthly') {
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  } else if (cycle === 'yearly') {
    date.setDate(date.getDate() + 365);
    return date.toISOString();
  } else if (cycle === 'lifetime') {
    return null; // Lifetime = unlimited
  }
  
  // Default to 30 days if unknown
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

/**
 * Check if a membership is currently active (not expired)
 * Handles both unlimited and limited memberships
 * 
 * @param {Object} membership - User membership object
 * @returns {boolean} - True if membership is active
 */
export function isMembershipActive(membership) {
  if (!membership) return false;
  
  // Check explicit status first
  if (membership.status !== 'active') return false;
  
  // If no end_date, it's unlimited and always active
  if (!membership.end_date) return true;
  
  // Check if end_date is in the future
  const endDate = new Date(membership.end_date);
  return endDate > new Date();
}

/**
 * Get days remaining in a membership
 * Returns Infinity for unlimited plans
 * 
 * @param {Object} membership - User membership object
 * @returns {number} - Days remaining (Infinity if unlimited, negative if expired)
 */
export function getDaysRemaining(membership) {
  if (!membership) return 0;
  
  // Unlimited memberships never expire
  if (!membership.end_date) return Infinity;
  
  const endDate = new Date(membership.end_date);
  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Validate plan data for admin/creation purposes
 * Ensures duration_days is never NULL (use 0 for unlimited)
 * 
 * @param {Object} planData - Plan data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validatePlanData(planData) {
  const errors = [];
  
  // Validate duration_days
  if (planData.duration_days === null || planData.duration_days === undefined) {
    errors.push('duration_days cannot be NULL. Use 0 for unlimited plans.');
  } else if (typeof planData.duration_days !== 'number') {
    errors.push('duration_days must be a number (0 for unlimited, >0 for limited).');
  } else if (planData.duration_days < 0) {
    errors.push('duration_days must be >= 0. Use 0 for unlimited plans.');
  }
  
  // Validate price
  if (typeof planData.price !== 'number' || planData.price < 0) {
    errors.push('price must be a non-negative number.');
  }
  
  // Ensure free plans use duration_days = 0 (best practice)
  if (planData.price === 0 && planData.duration_days > 0) {
    errors.push('Free plans (price = 0) should use duration_days = 0 for unlimited access.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}