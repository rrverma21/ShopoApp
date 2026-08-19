import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { isPlanUnlimited, isMembershipActive } from '@/lib/membershipUtils';

/**
 * CRITICAL: Unified hook to fetch active membership from the profiles table
 * 
 * DURATION LOGIC:
 * - duration_days = 0: Unlimited plan (e.g., FREE STARTER) - never expires
 * - duration_days > 0: Limited plan - expires after N days
 * - end_date = NULL: Plan never expires (unlimited)
 * - end_date = future date: Plan expires on that date
 * 
 * Both Admin manual activation and payment activations update the profiles table,
 * making it the single source of truth for current membership.
 * Includes real-time subscription for instant updates.
 */
export const useActiveMembership = () => {
  const { user } = useAuth();
  const [membership, setMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);

  const fetchMembership = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Query profiles table which is updated by AdminManualMembershipActivation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          membership_plan_id,
          membership_start_date,
          membership_end_date,
          membership_plans:membership_plan_id (
            id,
            name,
            price,
            price_yearly,
            duration_days,
            features,
            description,
            max_products,
            max_digital_products,
            max_pos_users,
            max_employees,
            allowed_business_category
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Check if profile has membership and it's still valid
      if (profileData?.membership_plan_id && profileData?.membership_plans) {
        const plan = profileData.membership_plans;
        const endDate = profileData.membership_end_date ? new Date(profileData.membership_end_date) : null;
        
        // CRITICAL: Properly handle unlimited plans (duration_days = 0)
        const isUnlimited = isPlanUnlimited(plan) || !endDate;
        const isExpired = !isUnlimited && endDate && endDate < new Date();

        if (!isExpired) {
          const transformedData = {
            user_id: profileData.id,
            membership_plan_id: profileData.membership_plan_id,
            start_date: profileData.membership_start_date,
            end_date: profileData.membership_end_date,
            status: 'active',
            auto_renewal_enabled: false,
            plan: {
              ...plan,
              is_unlimited: isUnlimited, // Add flag for easy checking
            },
            _source: 'profiles'
          };

          setMembership(transformedData);
          setHasActiveMembership(true);
          
          // Debug logging in development
          if (import.meta.env.DEV) {
            console.log('[useActiveMembership] Active membership loaded:', {
              plan_name: plan.name,
              duration_days: plan.duration_days,
              is_unlimited: isUnlimited,
              end_date: profileData.membership_end_date || 'never'
            });
          }
        } else {
          setMembership(null);
          setHasActiveMembership(false);
          
          if (import.meta.env.DEV) {
            console.log('[useActiveMembership] Membership expired:', {
              plan_name: plan.name,
              end_date: endDate
            });
          }
        }
      } else {
        setMembership(null);
        setHasActiveMembership(false);
        
        if (import.meta.env.DEV) {
          console.log('[useActiveMembership] No active membership found');
        }
      }

    } catch (err) {
      console.error('[useActiveMembership] Error fetching membership:', err);
      setError(err);
      setMembership(null);
      setHasActiveMembership(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMembership();

    if (!user?.id) return;

    // Real-time subscription to profiles table to catch Admin activations
    const profilesChannel = supabase
      .channel('profiles-membership-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          // Refresh if membership fields changed
          if (
            payload.new.membership_plan_id !== payload.old.membership_plan_id ||
            payload.new.membership_start_date !== payload.old.membership_start_date ||
            payload.new.membership_end_date !== payload.old.membership_end_date
          ) {
            console.log('[useActiveMembership] Membership change detected - refreshing...');
            fetchMembership();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [user?.id, fetchMembership]);

  return {
    membership,
    isLoading,
    error,
    hasActiveMembership,
    refetch: fetchMembership
  };
};