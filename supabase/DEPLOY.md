# Deploy Edge Functions to Supabase

## Prerequisites
Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

## Login to Supabase
```bash
supabase login
```

## Link your project
```bash
supabase link --project-ref lnfzvpaonuzbcnlulyyk
```

## Deploy functions
```bash
# Deploy all functions
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-password
supabase functions deploy admin-delete-user
```

## Set secrets (Service Role Key)
The Service Role Key is automatically available as `SUPABASE_SERVICE_ROLE_KEY` environment variable in Edge Functions.

## Test locally (optional)
```bash
supabase start
supabase functions serve
```

## Environment Variables
Add to your `.env` file:
```
VITE_SUPABASE_URL=https://lnfzvpaonuzbcnlulyyk.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

The `VITE_SUPABASE_URL` is used in AdminPanel.jsx to call Edge Functions.
