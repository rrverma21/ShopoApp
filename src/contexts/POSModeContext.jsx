import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const POSModeContext = createContext();

export const POSModeProvider = ({ children }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [billingMode, setBillingMode] = useState('retail');
    const [isHybrid, setIsHybrid] = useState(false);
    const [userPlanCategory, setUserPlanCategory] = useState('Retailer');

    useEffect(() => {
        const storedMode = localStorage.getItem('pos_billing_mode');
        const planCategory = user?.profile?.order_mode || user?.profile?.membership_plans?.allowed_business_category || 'Retailer';
        
        setUserPlanCategory(planCategory);

        if (planCategory === 'Wholesale + Retail' || planCategory === 'Wholesale+Retail') {
            setIsHybrid(true);
            const initialMode = (storedMode && ['retail', 'wholesale'].includes(storedMode)) ? storedMode : 'retail';
            setBillingMode(initialMode);
            localStorage.setItem('pos_billing_mode', initialMode);
        } else if (planCategory === 'Wholesaler' || planCategory === 'Wholesale') {
            setIsHybrid(false);
            setBillingMode('wholesale');
            localStorage.setItem('pos_billing_mode', 'wholesale');
        } else {
            setIsHybrid(false);
            setBillingMode('retail');
            localStorage.setItem('pos_billing_mode', 'retail');
        }
    }, [user]);

    const toggleMode = (mode) => {
        if (!['retail', 'wholesale'].includes(mode)) return;

        if (isHybrid) {
            setBillingMode(mode);
            localStorage.setItem('pos_billing_mode', mode);
            toast({
                title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode Active`,
                description: `Billing mode switched to ${mode}. Cart prices have been updated.`,
                variant: 'default',
            });
        } else {
            toast({
                title: "Action Not Permitted",
                description: `Your membership plan (${userPlanCategory}) does not allow switching modes.`,
                variant: "destructive"
            });
        }
    };

    // Clear mode on logout (handled by auth context indirectly, but we can expose a clear function)
    const clearMode = () => {
        localStorage.removeItem('pos_billing_mode');
        setBillingMode('retail');
    };

    return (
        <POSModeContext.Provider value={{ 
            billingMode, 
            currentBillingMode: billingMode, 
            toggleMode, 
            isHybrid,
            userPlanCategory,
            clearMode
        }}>
            {children}
        </POSModeContext.Provider>
    );
};

export const usePOSMode = () => useContext(POSModeContext);