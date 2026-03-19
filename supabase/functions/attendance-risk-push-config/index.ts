import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const cleanValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const vapidPublicKey = cleanValue(Deno.env.get('VAPID_PUBLIC_KEY'))

  return new Response(JSON.stringify({
    vapidPublicKey,
    configured: Boolean(vapidPublicKey),
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
})