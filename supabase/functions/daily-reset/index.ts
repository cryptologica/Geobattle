// Daily reset edge function for GeoBattle
// Runs daily at UTC midnight to reset resources and resolve expired attacks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    // Verify request is from Supabase cron or authorized source
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.includes(supabaseServiceKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily reset...');

    // 1. Reset daily resources
    const { error: resetError } = await supabase.rpc('reset_daily_resources');
    if (resetError) {
      console.error('Error resetting resources:', resetError);
      throw resetError;
    }
    console.log('✓ Resources reset');

    // 2. Resolve expired attacks
    const { error: attackError } = await supabase.rpc('resolve_expired_attacks');
    if (attackError) {
      console.error('Error resolving attacks:', attackError);
      throw attackError;
    }
    console.log('✓ Expired attacks resolved');

    // 3. Clean expired cooldowns
    const { error: cooldownError } = await supabase.rpc('clean_expired_cooldowns');
    if (cooldownError) {
      console.error('Error cleaning cooldowns:', cooldownError);
      throw cooldownError;
    }
    console.log('✓ Cooldowns cleaned');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily reset completed successfully',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Daily reset failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
