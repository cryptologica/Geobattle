# Supabase Edge Function Setup

## Daily Reset Function

The `daily-reset` edge function automatically runs database maintenance tasks every day at UTC midnight:

1. **Reset Daily Resources**: Grants each player 1 attack resource per game
2. **Resolve Expired Attacks**: Transfers territories where defense window expired
3. **Clean Expired Cooldowns**: Removes cooldowns older than the game's cooldown period

## Deployment Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
supabase link --project-ref <your-project-ref>
```

You can find your project ref in the Supabase dashboard URL:
`https://app.supabase.com/project/<your-project-ref>`

### 4. Deploy the Edge Function

```bash
supabase functions deploy daily-reset
```

### 5. Set Up Cron Trigger

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Enable the `pg_cron` extension if not already enabled
4. Navigate to **SQL Editor**
5. Run this SQL to schedule the function:

```sql
-- Schedule daily reset at UTC midnight
SELECT cron.schedule(
  'daily-reset-job',
  '0 0 * * *',  -- Every day at 00:00 UTC
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/daily-reset',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job;
```

Replace `<your-project-ref>` with your actual project reference.

#### Option B: Using Supabase Scheduled Functions (If Available)

1. Go to **Edge Functions** in the Supabase dashboard
2. Select the `daily-reset` function
3. Click **Schedule**
4. Set schedule to: `0 0 * * *` (daily at midnight UTC)
5. Save

### 6. Test the Function

You can manually trigger the function to test it:

```bash
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/daily-reset \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json"
```

Or from the Supabase dashboard:
1. Go to **Edge Functions**
2. Select `daily-reset`
3. Click **Invoke**

### 7. Monitor Execution

Check the function logs in the Supabase dashboard:
1. Navigate to **Edge Functions**
2. Select `daily-reset`
3. View the **Logs** tab

Expected log output:
```
Starting daily reset...
✓ Resources reset
✓ Expired attacks resolved
✓ Cooldowns cleaned
```

## Environment Variables

The edge function uses these environment variables (automatically provided by Supabase):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

No additional configuration needed.

## Troubleshooting

### Function Not Running

1. Verify pg_cron extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Check cron job status:
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Function Errors

Check the Edge Function logs in the Supabase dashboard for detailed error messages.

### Manual Execution

You can call the database functions directly if needed:

```sql
-- Reset resources manually
SELECT reset_daily_resources();

-- Resolve expired attacks manually
SELECT resolve_expired_attacks();

-- Clean cooldowns manually
SELECT clean_expired_cooldowns();
```

## Cron Schedule Format

The cron schedule `0 0 * * *` means:
- Minute: 0 (on the hour)
- Hour: 0 (midnight)
- Day of month: * (every day)
- Month: * (every month)
- Day of week: * (every day)

To change the schedule, modify the first parameter in the `cron.schedule` call.
