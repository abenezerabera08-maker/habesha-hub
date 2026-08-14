import type { SupabaseClient } from '@supabase/supabase-js'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // excludes 0/O and 1/I to avoid confusion

export async function generateTkCode(db: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
    }
    const { data } = await db.from('orders').select('id').eq('tk_code', code).maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique code.')
}
