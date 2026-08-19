import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import HSNMasterTable from '@/components/pos/hsn/HSNMasterTable';
import HSNUsageStats from '@/components/pos/hsn/HSNUsageStats';
import HSNModal from '@/components/pos/hsn/HSNModal';
import ApplyHSNToCategoryModal from '@/components/pos/hsn/ApplyHSNToCategoryModal';
import { Helmet } from 'react-helmet-async';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

const HSNMasterManagement = () => {
  const { user } = useAuth();
  const { fetchHSNCodes, subscribeToHSNChanges } = useHSNMaster();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHSN, setEditingHSN] = useState(null);
  
  // State for bulk update modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedHSNForCategory, setSelectedHSNForCategory] = useState(null);

  // Subscription state management
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [lastSubscriptionTime, setLastSubscriptionTime] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Ref to store cleanup function
  const unsubscribeRef = useRef(null);

  // Load HSN data
  const loadHSNMasters = async () => {
    console.log('[HSN Management] Loading HSN codes...');
    await fetchHSNCodes();
  };

  // Initial load
  useEffect(() => {
    if (user?.id) {
      loadHSNMasters();
    }
  }, [user?.id]);

  // Set up real-time subscription - ONLY ONCE per user
  useEffect(() => {
    if (!user?.id) {
      console.log('[HSN Management] Skipping subscription setup: No user ID');
      return;
    }

    console.log('[HSN Management] Setting up real-time subscription for user:', user.id);
    
    const setupSubscription = () => {
      try {
        // Clean up any existing subscription first
        if (unsubscribeRef.current) {
          console.log('[HSN Management] Cleaning up existing subscription before creating new one');
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        // Create new subscription
        const unsubscribe = subscribeToHSNChanges((payload) => {
          console.log('[HSN Management] Real-time event received:', payload.eventType);
          
          // Update subscription state
          setIsSubscribed(true);
          setSubscriptionError(null);
          setLastSubscriptionTime(new Date().toISOString());
          
          // Note: Data is already updated in the hook via setHsnCodes
          // No need to call loadHSNMasters here - it would cause double refresh
        });

        // Store cleanup function
        unsubscribeRef.current = unsubscribe;
        setIsSubscribed(true);
        setSubscriptionError(null);
        setLastSubscriptionTime(new Date().toISOString());
        
        console.log('[HSN Management] ✓ Subscription created successfully');
        
      } catch (error) {
        console.error('[HSN Management] ✗ Subscription setup failed:', error);
        setSubscriptionError(error.message);
        setIsSubscribed(false);
        
        // Retry logic - attempt to reconnect after 3 seconds
        if (retryCount < 3) {
          console.log(`[HSN Management] Retry attempt ${retryCount + 1}/3 in 3 seconds...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setupSubscription();
          }, 3000);
        } else {
          toast.error('Failed to establish real-time connection. Data will not auto-refresh.');
        }
      }
    };

    // Initial subscription setup
    setupSubscription();

    // Cleanup on unmount or user change
    return () => {
      console.log('[HSN Management] Component unmounting - cleaning up subscription');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        setIsSubscribed(false);
      }
    };
  }, [user?.id]); // Only depend on user.id - subscription should be created once

  const handleAddClick = () => {
    setEditingHSN(null);
    setModalOpen(true);
  };

  const handleEditClick = (hsn) => {
    setEditingHSN(hsn);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTimeout(() => setEditingHSN(null), 200); 
  };

  const handleModalSuccess = () => {
    console.log('[HSN Management] Modal success callback triggered');
    // Note: Data refresh is now handled automatically by:
    // 1. updateHSN awaiting fetchHSNCodes()
    // 2. Real-time subscription updating state via setHsnCodes
    // No need for manual refresh here
    handleCloseModal();
  };

  const handleApplyToCategory = (hsnData) => {
    setSelectedHSNForCategory(hsnData);
    setIsApplyModalOpen(true);
  };

  const handleApplySuccess = () => {
    setIsApplyModalOpen(false);
    // Refresh HSN list after applying to category
    loadHSNMasters();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6 pb-24">
      <Helmet>
        <title>HSN Master Management | Retailer POS</title>
        <meta name="description" content="Manage Harmonized System of Nomenclature codes and GST rates" />
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HSN Master</h1>
          <p className="text-muted-foreground mt-1">Manage Harmonized System of Nomenclature codes and GST rates.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Real-time connection indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs">
            {isSubscribed ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-600 animate-pulse" />
                <span className="text-green-600 font-medium">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-muted-foreground">Offline</span>
              </>
            )}
          </div>
          <Button onClick={handleAddClick} className="flex-1 md:flex-initial">
            <Plus className="mr-2 h-4 w-4" /> Add New HSN
          </Button>
        </div>
      </div>

      {/* Subscription error alert */}
      {subscriptionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates are currently unavailable: {subscriptionError}. 
            Your changes will still be saved, but you may need to refresh manually.
          </AlertDescription>
        </Alert>
      )}

      <HSNUsageStats />

      <Card>
        <CardHeader>
          <CardTitle>HSN Directory</CardTitle>
          <CardDescription>
            View, search, and edit your registered HSN configurations.
            {lastSubscriptionTime && (
              <span className="block text-xs text-muted-foreground mt-1">
                Last synced: {new Date(lastSubscriptionTime).toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HSNMasterTable 
            onAddClick={handleAddClick}
            onEditClick={handleEditClick}
            onApplyToCategory={handleApplyToCategory}
          />
        </CardContent>
      </Card>

      <HSNModal 
        isOpen={modalOpen} 
        onClose={handleCloseModal} 
        editingHSN={editingHSN}
        onSuccess={handleModalSuccess}
      />
      
      {/* Bulk Apply Modal */}
      <ApplyHSNToCategoryModal 
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        hsnId={selectedHSNForCategory?.id}
        hsnCode={selectedHSNForCategory?.code}
        hsnLabel={selectedHSNForCategory?.label}
        gstRate={selectedHSNForCategory?.gstRate}
        onSuccess={handleApplySuccess}
      />
    </div>
  );
};

export default HSNMasterManagement;