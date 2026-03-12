import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const insertAuditEvent = async ({
      actorUserId,
      actorEmail,
      eventType,
      recordId = null,
      metadata = {},
    }: {
      actorUserId: string | null
      actorEmail: string | null
      eventType: string
      recordId?: string | null
      metadata?: Record<string, unknown>
    }) => {
      const { error } = await supabaseAdmin.from('audit_events').insert([{
        event_type: eventType,
        table_name: 'users',
        record_id: recordId,
        actor_user_id: actorUserId,
        actor_email: actorEmail,
        metadata,
      }])

      if (error) {
        console.error('Audit insert error:', error)
      }
    }

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: actor } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!actor?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const payload = await req.json()
    const { userId } = payload
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, default_signature_url, person_profile_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(JSON.stringify({ error: 'Target user not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const updates: Record<string, unknown> = {}
    const metadata: Record<string, unknown> = {}

    if (Object.prototype.hasOwnProperty.call(payload, 'email') && payload.email && payload.email !== targetUser.email) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: payload.email,
        email_confirm: true,
      })

      if (authUpdateError) {
        await insertAuditEvent({
          actorUserId: user.id,
          actorEmail: user.email ?? null,
          eventType: 'admin.update_user_contact_failed',
          recordId: userId,
          metadata: {
            reason: authUpdateError.message,
            target_email: targetUser.email,
            requested_email: payload.email,
          },
        })

        return new Response(JSON.stringify({ error: authUpdateError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      updates.email = payload.email
      metadata.email = payload.email
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'name') && payload.name) {
      updates.name = payload.name
      metadata.name = payload.name
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'default_signature_url')) {
      updates.default_signature_url = payload.default_signature_url ?? null
      metadata.default_signature_url = payload.default_signature_url ?? null
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'person_profile_id')) {
      updates.person_profile_id = payload.person_profile_id ?? null
      metadata.person_profile_id = payload.person_profile_id ?? null
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (updateError) {
      await insertAuditEvent({
        actorUserId: user.id,
        actorEmail: user.email ?? null,
        eventType: 'admin.update_user_contact_failed',
        recordId: userId,
        metadata: {
          reason: updateError.message,
          ...metadata,
        },
      })

      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    await insertAuditEvent({
      actorUserId: user.id,
      actorEmail: user.email ?? null,
      eventType: 'admin.update_user_contact',
      recordId: userId,
      metadata,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})