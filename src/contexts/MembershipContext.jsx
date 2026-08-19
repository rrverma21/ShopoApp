import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useActiveMembership } from '@/hooks/useActiveMembership';

const MembershipContext = createContext();

export function MembershipProvider({ children }) {
  const { membership, isLoading, refetch } = useActiveMembership();
  
  const [membershipState, setMembershipState] = useState({
    hasMembership: false,
    activeMembershipPlan: null,
    membershipExpiryDate: null,
    membershipStatus: 'inactive'
  });

  // Keep state synced with the hook's returned data which now comes from AuthContext
  useEffect(() => {
    if (membership) {
      setMembershipState({
        hasMembership: true,
        activeMembershipPlan: membership.plan || null,
        membershipExpiryDate: membership.end_date || membership.membership_end_date || null,
        membershipStatus: 'active'
      });
    } else if (!isLoading) {
      setMembershipState({
        hasMembership: false,
        activeMembershipPlan: null,
        membershipExpiryDate: null,
        membershipStatus: 'inactive'
      });
    }
  }, [membership, isLoading]);

  // Provide a method to trigger manual refreshes
  const refreshMembership = useCallback(async () => {
    if (refetch) {
      await refetch();
    }
  }, [refetch]);

  return (
    <MembershipContext.Provider value={{ 
      ...membershipState, 
      isLoading, 
      refreshMembership 
    }}>
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);