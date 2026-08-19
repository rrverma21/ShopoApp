import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { isPlanUnlimited, isFreePlan, getDaysRemaining } from '@/lib/membershipUtils';

/**
 * ENHANCED usePlanLimits hook with proper unlimited plan support
 * 
 * CRITICAL FIXES:
 * - Properly handles duration_days = 0 (unlimited plans like FREE STARTER)
 * - Correctly checks features array for FREE STARTER plan
 * - No hardcoded restrictions blocking free plans from POS
 * - Gracefully handles missing plans with sensible defaults
 * 
 * DURATION LOGIC:
 * - duration_days = 0 OR end_date = NULL: Unlimited plan (never expires)
 * - duration_days > 0 AND end_date set: Limited plan (expires on end_date)
 */
export const usePlanLimits = () => {
    const { user, loading: authLoading } = useAuth();
    const [limits, setLimits] = useState({
        planName: 'Loading...',
        maxProducts: 0, 
        currentProducts: 0,
        remainingProducts: 0,
        isLimitReached: false,
        maxPosUsers: 1,
        currentPosUsers: 0,
        maxEmployees: 2,
        currentEmployees: 0,
        features: [],
        isLoading: true,
        daysRemaining: 0,
        hasPlanExpired: false,
        isUnlimitedPlan: false,
        membershipPlan: null
    });

    const fetchLimits = useCallback(async () => {
        // Wait for auth to load
        if (authLoading) return;

        if (!user) {
            setLimits(prev => ({ 
                ...prev, 
                isLoading: false,
                planName: 'No Account'
            }));
            return;
        }

        try {
            // 1. Get Profile with Plan Details
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select(`
                    id, 
                    membership_end_date,
                    membership_plan_id,
                    pos_product_limit,
                    digital_product_limit,
                    plan:membership_plans(
                        id, 
                        name, 
                        max_products, 
                        max_pos_users, 
                        max_employees, 
                        features,
                        price,
                        duration_days
                    )
                `)
                .eq('id', user.id)
                .single();
            
            if (profileError && profileError.code !== 'PGRST116') {
                console.error("[usePlanLimits] Error fetching profile:", profileError);
            }

            // 2. Get Current Product Count
            const { count: productCount, error: productError } = await supabase
                .from('point_of_sale_products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('archived', false);

            if (productError) {
                console.error("[usePlanLimits] Error fetching product count:", productError);
            }

            // 3. Get Current Team Count
            const { count: teamCount, error: teamError } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('admin_id', user.id)
                .eq('status', 'active');

            if (teamError) {
                console.error("[usePlanLimits] Error fetching team count:", teamError);
            }

            // 4. Get Current Employee Count
            const { count: employeeCount, error: employeeError } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (employeeError) {
                console.error("[usePlanLimits] Error fetching employee count:", employeeError);
            }

            // 5. Process Plan Data (with robust fallback)
            const fallbackPlan = {
                name: 'No Active Plan',
                max_products: 50,
                max_pos_users: 1,
                max_employees: 2,
                features: ['POS', 'Basic POS', 'Employee Management'],
                price: 0,
                duration_days: 0 // Fallback to unlimited
            };

            const plan = profile?.plan || fallbackPlan;
            const hasPlan = !!profile?.membership_plan_id;

            // CRITICAL: Check if plan is unlimited (duration_days = 0)
            const isUnlimitedPlan = isPlanUnlimited(plan);
            const isFree = isFreePlan(plan);

            // Determine effective limits
            const baseMaxProducts = plan.max_products ?? fallbackPlan.max_products;
            const profileOverride = profile?.pos_product_limit || 0;
            const effectiveMaxProducts = Math.max(baseMaxProducts, profileOverride);
            
            const currentProdCount = productCount || 0;
            const remainingProducts = Math.max(0, effectiveMaxProducts - currentProdCount);
            const isLimitReached = currentProdCount >= effectiveMaxProducts;

            const effectiveMaxPosUsers = plan.max_pos_users ?? fallbackPlan.max_pos_users;
            const effectiveMaxEmployees = plan.max_employees ?? fallbackPlan.max_employees;

            // Process features array (ensure POS is included for free/unlimited plans)
            let effectiveFeatures = Array.isArray(plan.features) ? [...plan.features] : [];
            
            // CRITICAL FIX: Ensure free/unlimited plans always have POS access
            if (isFree || isUnlimitedPlan) {
                const hasPOS = effectiveFeatures.some(f => 
                    f.toUpperCase() === 'POS' || 
                    f.toLowerCase().includes('point of sale')
                );
                
                if (!hasPOS) {
                    effectiveFeatures = [...effectiveFeatures, 'POS', 'Basic POS'];
                }
                
                const hasEmployeeManagement = effectiveFeatures.some(f => 
                    f.toLowerCase().includes('employee')
                );
                
                if (!hasEmployeeManagement) {
                    effectiveFeatures = [...effectiveFeatures, 'Employee Management'];
                }
            }

            // Calculate expiry status
            // CRITICAL: duration_days = 0 OR end_date = NULL means unlimited (never expires)
            const now = new Date();
            let daysRemaining = 0;
            let hasPlanExpired = false;

            if (isUnlimitedPlan || !profile?.membership_end_date) {
                // Unlimited plan - never expires
                hasPlanExpired = false;
                daysRemaining = Infinity;
            } else {
                // Limited plan - check expiry date
                const endDate = new Date(profile.membership_end_date);
                daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                hasPlanExpired = daysRemaining < 0;
            }

            // Set final state
            setLimits({
                planName: plan.name,
                maxProducts: effectiveMaxProducts,
                currentProducts: currentProdCount,
                remainingProducts,
                isLimitReached,
                maxPosUsers: effectiveMaxPosUsers,
                currentPosUsers: teamCount || 0,
                maxEmployees: effectiveMaxEmployees,
                currentEmployees: employeeCount || 0,
                features: effectiveFeatures,
                isLoading: false,
                daysRemaining: daysRemaining === Infinity ? 999999 : Math.max(0, daysRemaining),
                hasPlanExpired,
                isUnlimitedPlan,
                membershipPlan: plan
            });

            // Debug logging in development
            if (import.meta.env.DEV) {
                console.log('[usePlanLimits] Loaded limits:', {
                    plan: plan.name,
                    hasPlan,
                    isFree,
                    isUnlimited: isUnlimitedPlan,
                    duration_days: plan.duration_days,
                    features: effectiveFeatures,
                    expired: hasPlanExpired,
                    endDate: profile?.membership_end_date || 'never',
                    daysRemaining: daysRemaining === Infinity ? 'unlimited' : daysRemaining
                });
            }

        } catch (error) {
            console.error("[usePlanLimits] Unexpected error:", error);
            setLimits(prev => ({ 
                ...prev, 
                isLoading: false,
                planName: 'Error Loading Plan'
            }));
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchLimits();
    }, [fetchLimits]);

    // Real-time listener for profile/membership changes
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('plan_limits_realtime')
            .on(
                'postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'profiles', 
                    filter: `id=eq.${user.id}` 
                },
                (payload) => {
                    console.log('[usePlanLimits] Profile updated, refreshing limits');
                    fetchLimits();
                }
            )
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'point_of_sale_products', 
                    filter: `user_id=eq.${user.id}` 
                },
                () => fetchLimits()
            )
            .on(
                'postgres_changes',
                { 
                    event: 'DELETE', 
                    schema: 'public', 
                    table: 'point_of_sale_products', 
                    filter: `user_id=eq.${user.id}` 
                },
                () => fetchLimits()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, fetchLimits]);

    // Helper functions
    const canAddProduct = () => !limits.hasPlanExpired && !limits.isLimitReached;
    const canAddUser = () => !limits.hasPlanExpired && limits.currentPosUsers < limits.maxPosUsers;
    const canAddEmployee = () => !limits.hasPlanExpired && limits.currentEmployees < limits.maxEmployees;
    
    /**
     * CRITICAL FIX: hasFeature() now properly checks expired status and features array
     * - Returns false if plan is expired (but not if unlimited)
     * - Returns true for FREE/unlimited plans with POS feature
     * - Checks features array case-insensitively
     */
    const hasFeature = (featureName) => {
        if (limits.isLoading) return false;
        
        // CRITICAL: Unlimited plans never expire
        if (!limits.isUnlimitedPlan && limits.hasPlanExpired) {
            return false;
        }
        
        if (!limits.features || !Array.isArray(limits.features)) return false;
        
        const search = featureName.toLowerCase();
        
        // Special handling for POS feature (most common check)
        if (search === 'pos' || search === 'point of sale') {
            return limits.features.some(f => {
                const fLower = f.toLowerCase();
                return fLower === 'pos' || 
                       fLower.includes('point of sale') || 
                       fLower.includes('basic pos');
            });
        }

        // Generic feature check
        return limits.features.some(f => f.toLowerCase().includes(search));
    };

    return { 
        ...limits, 
        refreshLimits: fetchLimits,
        canAddProduct,
        canAddUser,
        canAddEmployee,
        hasFeature
    };
};