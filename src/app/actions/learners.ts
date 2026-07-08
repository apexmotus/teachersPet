'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

interface LearnerPayload {
  name: string
  surname: string
  class_id: string
  id_number?: string | null
  date_of_birth?: string | null
  parent_contact?: string | null
}

function validate(payload: LearnerPayload): string | null {
  if (!payload.name.trim()) return 'Name is required.'
  if (!payload.surname.trim()) return 'Surname is required.'
  if (!payload.class_id) return 'Class is required.'
  if (payload.id_number && !/^\d{13}$/.test(payload.id_number.trim()))
    return 'ID number must be exactly 13 digits.'
  if (payload.date_of_birth) {
    const dob = new Date(payload.date_of_birth)
    if (isNaN(dob.getTime())) return 'Invalid date of birth.'
    if (dob > new Date()) return 'Date of birth cannot be in the future.'
  }
  return null
}

export async function createLearner(payload: LearnerPayload): Promise<Result> {
  const validationError = validate(payload)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return { ok: false, error: 'No school associated with your account.' }

  // Verify class belongs to school
  const { data: cls } = await supabase
    .from('classes')
    .select('id')
    .eq('id', payload.class_id)
    .eq('school_id', profile.school_id)
    .single()
  if (!cls) return { ok: false, error: 'Invalid class.' }

  const { error } = await supabase.from('learners').insert({
    name: payload.name.trim(),
    surname: payload.surname.trim(),
    class_id: payload.class_id,
    school_id: profile.school_id,
    id_number: payload.id_number?.trim() || null,
    date_of_birth: payload.date_of_birth || null,
    parent_contact: payload.parent_contact?.trim() || null,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/learners')
  return { ok: true }
}

export async function updateLearner(id: string, payload: LearnerPayload): Promise<Result> {
  const validationError = validate(payload)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return { ok: false, error: 'No school associated with your account.' }

  const { data: cls } = await supabase
    .from('classes')
    .select('id')
    .eq('id', payload.class_id)
    .eq('school_id', profile.school_id)
    .single()
  if (!cls) return { ok: false, error: 'Invalid class.' }

  const { error } = await supabase
    .from('learners')
    .update({
      name: payload.name.trim(),
      surname: payload.surname.trim(),
      class_id: payload.class_id,
      id_number: payload.id_number?.trim() || null,
      date_of_birth: payload.date_of_birth || null,
      parent_contact: payload.parent_contact?.trim() || null,
    })
    .eq('id', id)
    .eq('school_id', profile.school_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/learners')
  return { ok: true }
}

export async function deleteLearner(id: string): Promise<Result> {
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
    .from('learners')
    .delete()
    .eq('id', id)
    .eq('school_id', profile.school_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/learners')
  return { ok: true }
}
