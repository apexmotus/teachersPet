'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

export async function createReflection(date: string, notes: string): Promise<Result> {
  if (notes.trim().length < 10) return { ok: false, error: 'Reflection must be at least 10 characters.' }

  const today = new Date().toISOString().split('T')[0]
  if (date > today) return { ok: false, error: 'Cannot submit a reflection for a future date.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return { ok: false, error: 'No school associated with your account.' }

  const { error } = await supabase
    .from('reflections')
    .upsert(
      {
        teacher_id: user.id,
        school_id: profile.school_id,
        date,
        notes: notes.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id,date' }
    )

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}
