import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [membershipData, setMembershipData] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipError, setMembershipError] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const fetchUserMembership = useCallback(async (userId) => {
    setMembershipLoading(true);
    setMembershipError(null);
    try {
      let memData = null;

      const { data: umData, error: umError } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (umError) console.error('Error querying user_memberships:', umError);

      if (umData) {
        memData = umData;
      } else {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('membership_plan_id, membership_start_date, membership_end_date')
          .eq('id', userId)
          .single();

        if (!profileError && profileData?.membership_plan_id) {
          memData = {
            user_id: userId,
            plan_id: profileData.membership_plan_id,
            start_date: profileData.membership_start_date,
            end_date: profileData.membership_end_date,
            status: 'active',
            _source: 'profiles_fallback'
          };
        }
      }

      if (memData) {
        const endDate = memData.end_date || memData.membership_end_date;
        if (endDate && new Date(endDate) < new Date()) {
          memData = null; 
        } else {
          const planId = memData.plan_id || memData.membership_plan_id;
          if (planId) {
            const { data: planData } = await supabase
              .from('membership_plans')
              .select('*')
              .eq('id', planId)
              .single();
            if (planData) {
              memData.plan = planData;
            }
          }
        }
      }

      setMembershipData(memData);
    } catch (err) {
      console.error('Exception in fetchUserMembership:', err);
      setMembershipError(err);
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  const handleSession = useCallback(async (currentSession) => {
    try {
      setSession(currentSession);
      if (currentSession?.user) {
        const profile = await fetchProfile(currentSession.user.id);
        setUser({ ...currentSession.user, profile });
        await fetchUserMembership(currentSession.user.id);
      } else {
        setUser(null);
        setMembershipData(null);
        setMembershipLoading(false);
      }
    } catch (err) {
      console.error("Error handling session:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchUserMembership]);

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        await handleSession(data.session);
      } catch (err) {
        console.error("Critical: Failed to get initial session.", err);
        setError(err);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          await handleSession(session);
        } catch (err) {
          console.error("Error in onAuthStateChange callback:", err);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `membership_updates_auth_${user.id}`;
    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_memberships',
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        fetchUserMembership(user.id);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        if (payload.new.membership_plan_id !== payload.old.membership_plan_id) {
          fetchUserMembership(user.id);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [user?.id, fetchUserMembership]);

  const refreshUserProfile = useCallback(async () => {
    if (session?.user?.id) {
      const profile = await fetchProfile(session.user.id);
      setUser({ ...session.user, profile });
      await supabase.auth.refreshSession();
    }
  }, [session, fetchProfile]);

  const refreshJwtProfile = refreshUserProfile;

  const signUp = useCallback(async (email, password, options = {}) => {
    if (!options.emailRedirectTo) {
      options.emailRedirectTo = `${window.location.origin}/verified`;
    }
    
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }
    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let msg = error.message;
      if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Please verify your email before logging in.';
      }
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: msg,
      });
      return { error: new Error(msg), success: false };
    }
    return { error: null, success: true, data };
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        const isSessionNotFound = error.status === 403 || error.message?.toLowerCase().includes('session_not_found') || error.name === 'AuthSessionMissingError';
        if (!isSessionNotFound) {
          toast({
            variant: "destructive",
            title: "Sign out note",
            description: "Network issue during sign out, but local session will be cleared."
          });
        }
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign out note",
        description: "Unexpected error during sign out. Local session will be cleared."
      });
    }

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }

    setUser(null);
    setSession(null);
    setMembershipData(null);
    window.location.href = '/login';
    return { error: null };
  }, [toast]);

  const resendVerificationEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/verified`
      }
    });
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  const refetchMembership = useCallback(() => {
    if (user?.id) fetchUserMembership(user.id);
  }, [user?.id, fetchUserMembership]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    error,
    membershipData,
    membershipLoading,
    membershipError,
    refetchMembership,
    signUp,
    signIn,
    signOut,
    refreshUserProfile,
    refreshJwtProfile,
    resendVerificationEmail,
    resetPassword
  }), [user, session, loading, error, membershipData, membershipLoading, membershipError, refetchMembership, signUp, signIn, signOut, refreshUserProfile, refreshJwtProfile, resendVerificationEmail, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};