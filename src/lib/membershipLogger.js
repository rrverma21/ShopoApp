import { supabase } from '@/lib/supabaseClient';

/**
 * Logs membership related events to Supabase for auditing and debugging.
 * @param {string} event_type - E.g., 'WEBHOOK_RECEIVED', 'ACTIVATION_SUCCESS'
 * @param {Object} params - The context of the event
 * @param {string} [params.user_id]
 * @param {string} [params.plan_id]
 * @param {string} [params.order_id]
 * @param {string} [params.status]
 * @param {string} [params.error_message]
 * @param {Object} [params.details] - Any additional JSON data
 */
export async function logMembershipEvent(event_type, { user_id, plan_id, order_id, status, error_message, details } = {}) {
    const logData = {
        event_type,
        user_id,
        plan_id,
        order_id,
        status,
        error_message,
        details: details ? details : null,
        created_at: new Date().toISOString()
    };

    // Console log for development
    if (import.meta.env.DEV) {
        console.groupCollapsed(`[Membership Log] ${event_type}`);
        console.log(logData);
        if (error_message) console.error(error_message);
        console.groupEnd();
    }

    try {
        const { error } = await supabase.from('membership_activation_logs').insert(logData);
        if (error) {
            console.error('Failed to push membership log to Supabase:', error);
        }
    } catch (e) {
        console.error('Exception logging membership event:', e);
    }
}