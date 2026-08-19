import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const PosDataContext = createContext();

export const usePosData = () => useContext(PosDataContext);

export const PosDataProvider = ({ children }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [lastSaleTimestamp, setLastSaleTimestamp] = useState(null);
    const [businessId, setBusinessId] = useState(null);
    const [userRole, setUserRole] = useState('owner');
    const [permissions, setPermissions] = useState([]);
    const [businessProfile, setBusinessProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isMounted = useRef(true);

    const refreshData = useCallback(() => {
        if (isMounted.current) {
            setLastSaleTimestamp(new Date().toISOString());
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;

        const initPosData = async () => {
            if (!user) {
                if (isMounted.current) {
                    setBusinessId(null);
                    setPermissions([]);
                    setBusinessProfile(null);
                    setIsLoading(false);
                }
                return;
            }

            try {
                setIsLoading(true);
                
                const { data: teamMember, error: teamError } = await supabase
                    .from('team_members')
                    .select('admin_id, role, status')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .maybeSingle();

                if (teamError && teamError.code !== 'PGRST116') {
                    console.error("[PosDataContext] Team check error:", teamError);
                }

                let activeBusinessId = user.id;
                let activeRole = 'owner';

                if (teamMember) {
                    activeBusinessId = teamMember.admin_id;
                    activeRole = (teamMember.role && teamMember.role.length > 0) ? teamMember.role[0] : 'staff';
                }

                const { data: settings, error: settingsError } = await supabase
                    .from('pos_retailer_settings')
                    .select('role_permissions, shop_type')
                    .eq('user_id', activeBusinessId)
                    .maybeSingle();

                if (settingsError && settingsError.code !== 'PGRST116') {
                     console.error("[PosDataContext] Settings check error:", settingsError);
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', activeBusinessId)
                    .single();

                if (profileError) {
                    console.error("[PosDataContext] Profile check error:", profileError);
                }

                if (isMounted.current) {
                    setBusinessId(activeBusinessId);
                    setUserRole(activeRole);
                    setBusinessProfile(profile);

                    if (activeRole === 'owner') {
                        setPermissions(['all']); 
                    } else {
                        const rolePerms = settings?.role_permissions?.[activeRole];
                        const defaults = {
                            manager: ['point-of-sale', 'products', 'customers', 'sales', 'reports', 'settings', 'refunds', 'milk-delivery', 'pending-payments', 'smart-reorder', 'orders'],
                            cashier: ['point-of-sale', 'customers', 'sales', 'refunds', 'pending-payments', 'orders'],
                            staff: ['point-of-sale']
                        };

                        if (rolePerms) {
                            let effectivePerms = [...rolePerms];
                            const defaultForRole = defaults[activeRole] || [];
                            if (defaultForRole.includes('orders') && !effectivePerms.includes('orders')) {
                                effectivePerms.push('orders');
                            }
                            setPermissions(effectivePerms);
                        } else {
                            setPermissions(defaults[activeRole] || ['point-of-sale']);
                        }
                    }
                }

            } catch (err) {
                console.error("[PosDataContext] Error initializing POS data:", err);
            } finally {
                if (isMounted.current) setIsLoading(false);
            }
        };

        initPosData();

        return () => { 
            isMounted.current = false; 
        };
    }, [user]);

    useEffect(() => {
        if (!businessId) return;

        let channel;
        try {
            const channelName = `pos_settings_changes_${businessId}_${Date.now()}`;
            channel = supabase.channel(channelName)
                .on(
                    'postgres_changes',
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'pos_retailer_settings', 
                        filter: `user_id=eq.${businessId}` 
                    },
                    (payload) => {
                        if (isMounted.current) {
                            console.log('[PosDataContext] Settings updated in real-time', payload);
                            refreshData();
                        }
                    }
                )
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[PosDataContext] Successfully subscribed to pos settings for business ${businessId}`);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[PosDataContext] Channel error occurred:', err);
                    }
                });
        } catch (error) {
            console.error('Subscription error:', error);
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [businessId, refreshData]);

    const hasPermission = useCallback((featureKey) => {
        if (userRole === 'owner' || permissions.includes('all')) return true;
        return permissions.includes(featureKey);
    }, [userRole, permissions]);

    const value = useMemo(() => ({
        lastSaleTimestamp,
        refreshData,
        businessId,
        userRole,
        permissions,
        hasPermission,
        businessProfile,
        isLoading
    }), [lastSaleTimestamp, businessId, userRole, permissions, businessProfile, isLoading, refreshData, hasPermission]);

    return (
        <PosDataContext.Provider value={value}>
            {children}
        </PosDataContext.Provider>
    );
};