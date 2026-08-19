import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Trophy, Users, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInSeconds } from 'date-fns';

const formatTimeLeft = (seconds) => {
  if (seconds <= 0) return '00:00:00';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getTimerColor = (seconds) => {
  if (seconds > 86400) return 'text-green-100'; // > 1 day
  if (seconds > 3600) return 'text-yellow-100'; // > 1 hour
  return 'text-red-100';
};

/**
 * Helper function to extract reward pool amount from various possible JSONB structures
 * Tries multiple common key patterns and provides fallback logic
 */
const extractRewardPool = (rewardsConfig) => {
  if (!rewardsConfig) {
    console.warn('[RewardPeriodsDisplay] No rewards_config data provided');
    return 0;
  }

  // CRITICAL DEBUG: Log the raw structure first
  console.log('[RewardPeriodsDisplay] ===== REWARD POOL EXTRACTION DEBUG =====');
  console.log('[RewardPeriodsDisplay] Raw rewards_config object:', JSON.stringify(rewardsConfig, null, 2));
  console.log('[RewardPeriodsDisplay] Available keys in rewards_config:', Object.keys(rewardsConfig));
  console.log('[RewardPeriodsDisplay] Type of rewards_config:', typeof rewardsConfig);

  // Try multiple possible key names (expanded list based on admin showing "Pool: 1000")
  const possibleKeys = [
    'pool',              // NEW: Based on admin panel showing "Pool: 1000"
    'pool_amount',       // Variant of pool
    'reward_pool',       // Current expected key
    'total_pool',        // Alternative naming
    'prize_amount',      // Alternative naming
    'prize',             // Simple key
    'amount',            // Simple key
    'reward',            // Simple key
    'total_prize',       // Alternative naming
    'reward_amount',     // Alternative naming
  ];

  console.log('[RewardPeriodsDisplay] Searching for prize amount using keys:', possibleKeys);

  for (const key of possibleKeys) {
    const value = rewardsConfig[key];
    
    console.log(`[RewardPeriodsDisplay] Checking key "${key}": value =`, value, `(type: ${typeof value})`);
    
    if (value !== undefined && value !== null) {
      // Convert to number and validate
      const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
      
      console.log(`[RewardPeriodsDisplay] Key "${key}" conversion result:`, numValue, `(isNaN: ${isNaN(numValue)})`);
      
      if (!isNaN(numValue) && numValue > 0) {
        console.log(`[RewardPeriodsDisplay] ✅ SUCCESS! Found reward pool using key "${key}": ₹${numValue}`);
        console.log('[RewardPeriodsDisplay] ===== END DEBUG =====');
        return numValue;
      }
    }
  }

  // If we get here, no valid prize was found
  console.warn('[RewardPeriodsDisplay] ❌ FAILED to find valid reward pool amount');
  console.warn('[RewardPeriodsDisplay] Available keys:', Object.keys(rewardsConfig));
  console.warn('[RewardPeriodsDisplay] Full config object:', JSON.stringify(rewardsConfig, null, 2));
  console.warn('[RewardPeriodsDisplay] All key-value pairs:');
  Object.entries(rewardsConfig).forEach(([key, value]) => {
    console.warn(`  - "${key}": ${JSON.stringify(value)} (type: ${typeof value})`);
  });
  console.log('[RewardPeriodsDisplay] ===== END DEBUG =====');
  
  return 0;
};

/**
 * Helper to extract total winners count from rewards_config
 */
const extractTotalWinners = (rewardsConfig) => {
  if (!rewardsConfig) return null;
  
  const possibleKeys = ['total_winners', 'winners', 'winner_count', 'num_winners'];
  
  for (const key of possibleKeys) {
    const value = rewardsConfig[key];
    if (value !== undefined && value !== null) {
      const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
      if (!isNaN(numValue) && numValue > 0) {
        return numValue;
      }
    }
  }
  
  return null;
};

const RewardPeriodsDisplay = () => {
  const [activePeriods, setActivePeriods] = useState([]);
  const [upcomingPeriods, setUpcomingPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchPeriods = async () => {
    try {
      const currentDate = new Date().toISOString();
      const { data, error } = await supabase
        .from('reward_periods')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // CRITICAL DEBUG: Log all fetched periods to inspect data structure
      console.log('[RewardPeriodsDisplay] ===== FETCHED REWARD PERIODS =====');
      console.log('[RewardPeriodsDisplay] Total periods fetched:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('[RewardPeriodsDisplay] First period sample:', JSON.stringify(data[0], null, 2));
      }

      const active = [];
      const upcoming = [];

      data.forEach((period, index) => {
        // Additional debug logging for each period
        console.log(`[RewardPeriodsDisplay] ===== Period ${index + 1}: "${period.name}" =====`);
        console.log('[RewardPeriodsDisplay] Period ID:', period.id);
        console.log('[RewardPeriodsDisplay] Start Date:', period.start_date);
        console.log('[RewardPeriodsDisplay] End Date:', period.end_date);
        console.log('[RewardPeriodsDisplay] Is Active:', period.is_active);
        console.log('[RewardPeriodsDisplay] Rewards Config Type:', typeof period.rewards_config);
        console.log('[RewardPeriodsDisplay] Rewards Config:', JSON.stringify(period.rewards_config, null, 2));
        console.log('[RewardPeriodsDisplay] All columns:', Object.keys(period));

        if (new Date(period.start_date) <= new Date() && new Date(period.end_date) >= new Date()) {
          console.log('[RewardPeriodsDisplay] ✅ Period is ACTIVE');
          active.push(period);
        } else if (new Date(period.start_date) > new Date()) {
          console.log('[RewardPeriodsDisplay] 📅 Period is UPCOMING');
          upcoming.push(period);
        } else {
          console.log('[RewardPeriodsDisplay] ⏰ Period is EXPIRED');
        }
      });

      console.log('[RewardPeriodsDisplay] ===== SUMMARY =====');
      console.log('[RewardPeriodsDisplay] Active periods:', active.length);
      console.log('[RewardPeriodsDisplay] Upcoming periods:', upcoming.length);
      console.log('[RewardPeriodsDisplay] ===== END FETCH =====');

      setActivePeriods(active);
      setUpcomingPeriods(upcoming.slice(0, 3));
    } catch (error) {
      console.error('[RewardPeriodsDisplay] ❌ Error fetching reward periods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();

    const channel = supabase
      .channel('public:reward_periods')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_periods' }, fetchPeriods)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (activePeriods.length === 0 && upcomingPeriods.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-6 mb-6">
      {/* Active Periods */}
      {activePeriods.map((period) => {
        const secondsLeft = differenceInSeconds(new Date(period.end_date), now);
        const rewardPool = extractRewardPool(period.rewards_config);
        const totalWinners = extractTotalWinners(period.rewards_config);
        
        // Debug log before rendering
        console.log(`[RewardPeriodsDisplay] Rendering active period "${period.name}" with pool: ${rewardPool}`);
        
        return (
          <motion.div
            key={period.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <Card className="overflow-hidden border-0 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse-border bg-gradient-to-br from-emerald-500 to-emerald-700 text-white relative rounded-2xl">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
              <CardContent className="p-6 md:p-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                      <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                      Active Now
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-sm">
                      {period.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-emerald-50 font-medium text-sm md:text-base">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 opacity-80" />
                        {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 opacity-80" />
                        {totalWinners || 'Multiple'} Winners
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end gap-2 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 w-full md:w-auto">
                    <div className="text-emerald-100 uppercase text-[10px] font-bold tracking-wider">Reward Pool</div>
                    <div className="text-3xl md:text-4xl font-black text-yellow-300 drop-shadow-md">
                      {rewardPool > 0 ? `₹${rewardPool.toLocaleString('en-IN')}` : 'Prize TBD'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className={`h-4 w-4 ${getTimerColor(secondsLeft)}`} />
                      <span className={`text-lg font-mono font-bold tracking-wider ${getTimerColor(secondsLeft)}`}>
                        {formatTimeLeft(secondsLeft)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Upcoming Periods */}
      {upcomingPeriods.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            Upcoming Rewards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {upcomingPeriods.map((period) => {
              const secondsUntil = differenceInSeconds(new Date(period.start_date), now);
              const rewardPool = extractRewardPool(period.rewards_config);
              
              // Debug log before rendering
              console.log(`[RewardPeriodsDisplay] Rendering upcoming period "${period.name}" with pool: ${rewardPool}`);
              
              return (
                <motion.div
                  key={period.id}
                  whileHover={{ scale: 1.02 }}
                  className="transition-all duration-300"
                >
                  <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl">
                    <CardContent className="p-5 md:p-6">
                      <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
                        Coming Soon
                      </div>
                      <h4 className="text-lg font-bold mb-1.5">{period.name}</h4>
                      <p className="text-blue-100 text-xs mb-3 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Starts: {format(new Date(period.start_date), 'MMM d, yyyy')}
                      </p>
                      
                      <div className="bg-black/10 rounded-lg p-3 mb-3">
                        <div className="text-[10px] text-blue-100 uppercase font-semibold mb-0.5">Reward Pool</div>
                        <div className="text-xl font-black text-yellow-300">
                          {rewardPool > 0 ? `₹${rewardPool.toLocaleString('en-IN')}` : 'Prize TBD'}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs font-medium bg-white/10 rounded-md px-3 py-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Starts in
                        </span>
                        <span className="font-mono text-sm">{formatTimeLeft(secondsUntil)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardPeriodsDisplay;