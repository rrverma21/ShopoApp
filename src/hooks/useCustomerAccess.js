// This hook is deprecated and no longer used.
// Real-time presence tracking has been removed in favor of simple timestamp tracking.
export const useCustomerAccess = () => {
  return {
    accessStatus: {},
    reportAccess: async () => {},
  };
};