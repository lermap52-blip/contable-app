import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vutwcjjzufystleuefnz.supabase.co'
const supabaseKey = 'sb_publishable_yvI9d6-Zeg1IN3jhrI7JsA_BH4onRAL'

export const supabase = createClient(supabaseUrl, supabaseKey)
