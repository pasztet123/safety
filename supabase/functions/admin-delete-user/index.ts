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

    // Verify the request is from an admin user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { userId } = await req.json()

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle()

    const deletedAt = new Date().toISOString()

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        deleted_at: deletedAt,
        deleted_by: user.id,
      })
      .eq('id', userId)

    if (dbError) {
      await insertAuditEvent({
        actorUserId: user.id,
        actorEmail: user.email ?? null,
        eventType: 'admin.delete_user_failed',
        recordId: userId,
        metadata: {
          target_email: targetUser?.email || null,
          reason: dbError.message,
        },
      })
      return new Response(JSON.stringify({ error: dbError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Delete from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      await insertAuditEvent({
        actorUserId: user.id,
        actorEmail: user.email ?? null,
        eventType: 'admin.delete_user_failed',
        recordId: userId,
        metadata: {
          target_email: targetUser?.email || null,
          reason: deleteError.message,
        },
      })
      return new Response(JSON.stringify({ error: deleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    await insertAuditEvent({
      actorUserId: user.id,
      actorEmail: user.email ?? null,
      eventType: 'admin.delete_user',
      recordId: userId,
      metadata: {
        target_email: targetUser?.email || null,
        target_name: targetUser?.name || null,
        deleted_at: deletedAt,
      },
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
