import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dscphdydicnctbubeftq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzY3BoZHlkaWNuY3RidWJlZnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjk4MzMsImV4cCI6MjA3MjY0NTgzM30.bRAQGnoRzky1xEIRaPjvD0VpmhgMyqRdyIbHKKxlVRc';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
