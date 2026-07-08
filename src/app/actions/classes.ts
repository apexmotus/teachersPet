'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

interface ClassPayload {
  name: string
  grade: number
  year?: number
}

const LEADERSHIP = ['dh', 'dp', 'principal']

function validate(payload: ClassPayload): string | null {
  if (!payload.name.trim()) return 'Class name is required.'
  if (!Number.isInteger(payload.grade) || payload.grade < 1 || payload.grade > 12)
    return 'Grade must be between 1 and 12.'
  return null
}

async function getLeadershipContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return null
  if (!LEADERSHIP.includes(profile.role)) return null
  return { user, profile: { ...profile, school_id: profile.school_id! } }
}

export async function createClass(payload: ClassPayload): Promise<Result> {
  const err = validate(payload)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const ctx = await getLeadershipContext(supabase)
  if (!ctx) return { ok: false, error: 'Only leadership can manage classes.' }

  const { error } = await supabase.from('classes').insert({
    name: payload.name.trim(),
    grade: payload.grade,
    year: payload.year ?? new Date().getFullYear(),
    school_id: ctx.profile.school_id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/classes')
  return { ok: true }
}

export async function updateClass(id: string, payload: ClassPayload): Promise<Result> {
  const err = validate(payload)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const ctx = await getLeadershipContext(supabase)
  if (!ctx) return { ok: false, error: 'Only leadership can manage classes.' }

  const { error } = await supabase
    .from('classes')
    .update({
      name: payload.name.trim(),
      grade: payload.grade,
      year: payload.year ?? new Date().getFullYear(),
    })
    .eq('id', id)
    .eq('school_id', ctx.profile.school_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/classes')
  return { ok: true }
}

export async function deleteClass(id: string): Promise<Result> {
  const supabase = await createClient()
  const ctx = await getLeadershipContext(supabase)
  if (!ctx) return { ok: false, error: 'Only leadership can manage classes.' }

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)
    .eq('school_id', ctx.profile.school_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/classes')
  return { ok: true }
}
