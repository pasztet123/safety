import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lnfzvpaonuzbcnlulyyk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZnp2cGFvbnV6YmNubHVseXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTU3MDcsImV4cCI6MjA3Mzc3MTcwN30.031UwVA_BNJTAvEVbjhSjzVmfLmD2hSpXZl8flSy1cw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
