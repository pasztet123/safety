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
    console.log('=== Starting user creation ===')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log('Supabase admin client created')

    // Verify the request is from an admin user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log('Requesting user verified:', user.email)

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      console.error('User is not admin:', user.email)
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    console.log('Admin verified')

    const { email, password, name, is_admin, default_signature_url } = await req.json()
    console.log('Creating user:', email)

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log('User already exists in database:', email)
      return new Response(JSON.stringify({ error: 'User with this email already exists in database' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log('Checking for existing auth user')

    // Try to get existing auth user
    const { data: { users: existingAuthUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers.find(u => u.email === email)

    let userId: string

    if (existingAuthUser) {
      console.log('User exists in Auth, reusing ID:', existingAuthUser.id)
      // User exists in Auth but not in users table - use existing ID
      userId = existingAuthUser.id
    } else {
      console.log('Creating new auth user')
      // Create new auth user
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name
        }
      })

      if (createError) {
        console.error('Auth creation error:', createError)
        return new Response(JSON.stringify({ error: `Auth error: ${createError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      console.log('Auth user created:', authData.user.id)
      userId = authData.user.id
    }

    console.log('Inserting into users table, userId:', userId)

    // Double-check user doesn't exist in users table with this ID
    const { data: existingUserById } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (existingUserById) {
      console.log('User already exists in database with this ID:', userId, existingUserById.email)
      return new Response(JSON.stringify({ error: 'User with this ID already exists in database' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Add to users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        email,
        name,
        is_admin,
        default_signature_url,
      }])

    if (dbError) {
      console.error('Database insert error:', dbError)
      // If insert failed and we just created the auth user, clean it up
      if (!existingAuthUser) {
        console.log('Cleaning up auth user due to DB error')
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      
      return new Response(JSON.stringify({ error: `Database error: ${dbError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log('User successfully created:', email)

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
