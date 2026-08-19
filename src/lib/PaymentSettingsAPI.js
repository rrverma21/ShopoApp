import { supabase } from '@/lib/customSupabaseClient';

export const PaymentSettingsAPI = {
  async getPaymentSettings(userId) {
    try {
      // 1. Get Settings
      // We use select() instead of single() to avoid PGRST116 error when no rows exist
      let { data: settingsData, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('seller_id', userId);

      if (error) throw error;

      let settings = settingsData?.[0];

      if (!settings) {
        // Return default structure if no settings found
        settings = {
          seller_id: userId,
          cod_enabled: true,
          online_payments_enabled: false
        };
      }

      // 2. Get Gateways
      const { data: gateways, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select(`
          *,
          payment_credentials (*)
        `)
        .eq('seller_id', userId);

      if (gatewaysError) throw gatewaysError;

      // Format gateways to include credentials as a simple object
      const formattedGateways = (gateways || []).map(g => {
        const credsObj = {};
        if (g.payment_credentials && Array.isArray(g.payment_credentials)) {
            g.payment_credentials.forEach(c => {
                credsObj[c.credential_key] = c.credential_value;
            });
        }
        return {
            ...g,
            credentials: credsObj
        };
      });

      return {
        settings,
        gateways: formattedGateways
      };

    } catch (error) {
      console.error('Error fetching payment settings:', error);
      throw error;
    }
  },

  async savePaymentSettings(userId, codEnabled, onlineEnabled) {
    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({
        seller_id: userId,
        cod_enabled: codEnabled,
        online_payments_enabled: onlineEnabled,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async savePaymentGateway(userId, gatewayType, isEnabled, testMode, credentials) {
    // 1. Upsert Gateway
    let { data: existingGateways } = await supabase
        .from('payment_gateways')
        .select('id')
        .eq('seller_id', userId)
        .eq('gateway_type', gatewayType);

    let gatewayId = existingGateways?.[0]?.id;

    if (!gatewayId) {
        const { data: newGateway, error: createError } = await supabase
            .from('payment_gateways')
            .insert({
                seller_id: userId,
                gateway_type: gatewayType,
                is_enabled: isEnabled,
                test_mode: testMode
            })
            .select()
            .single();
        
        if (createError) throw createError;
        gatewayId = newGateway.id;
    } else {
        const { error: updateError } = await supabase
            .from('payment_gateways')
            .update({
                is_enabled: isEnabled,
                test_mode: testMode,
                updated_at: new Date().toISOString()
            })
            .eq('id', gatewayId);

        if (updateError) throw updateError;
    }

    // 2. Upsert Credentials
    if (credentials && Object.keys(credentials).length > 0) {
        // Fetch existing credentials for this gateway
        const { data: existingCreds } = await supabase
            .from('payment_credentials')
            .select('*')
            .eq('gateway_id', gatewayId);
            
        const existingMap = {};
        existingCreds?.forEach(c => existingMap[c.credential_key] = c);

        for (const [key, value] of Object.entries(credentials)) {
            if (existingMap[key]) {
                // Update if changed
                if (existingMap[key].credential_value !== value) {
                    await supabase
                        .from('payment_credentials')
                        .update({ credential_value: value })
                        .eq('id', existingMap[key].id);
                }
            } else {
                // Insert new
                await supabase
                    .from('payment_credentials')
                    .insert({
                        gateway_id: gatewayId,
                        credential_key: key,
                        credential_value: value
                    });
            }
        }
    }
  }
};