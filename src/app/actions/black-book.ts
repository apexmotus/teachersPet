'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import type { BlackBookSeverity } from '@/lib/types/database'

type Result = { ok: true } | { ok: false; error: string }
type CreateResult = { ok: true; id: string } | { ok: false; error: string }

const LEADERSHIP = ['dh', 'dp', 'principal']

interface BlackBookPayload {
  learner_id: string
  class_id: string
  date: string
  description: string
  severity: BlackBookSeverity
  occurrence_id?: string | null
}

function validatePayload(p: BlackBookPayload): string | null {
  if (!p.learner_id) return 'Learner is required.'
  if (!p.class_id) return 'Class is required.'
  if (!p.date) return 'Date is required.'
  if (p.description.trim().length < 5) return 'Description must be at least 5 characters.'
  if (!['minor', 'moderate', 'serious'].includes(p.severity)) return 'Invalid severity level.'
  const today = new Date().toISOString().split('T')[0]
  if (p.date > today) return 'Cannot log an incident for a future date.'
  return null
}

async function getAuthCtx(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role, name, surname')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return null
  return {
    user,
    schoolId: profile.school_id,
    role: profile.role,
    name: `${profile.name} ${profile.surname}`,
    isLeadership: LEADERSHIP.includes(profile.role),
  }
}

export async function createBlackBookEntry(payload: BlackBookPayload): Promise<CreateResult> {
  const err = validatePayload(payload)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  // Verify learner and class belong to school
  const [{ data: learner }, { data: cls }] = await Promise.all([
    supabase.from('learners').select('id').eq('id', payload.learner_id).eq('school_id', ctx.schoolId).single(),
    supabase.from('classes').select('id').eq('id', payload.class_id).eq('school_id', ctx.schoolId).single(),
  ])
  if (!learner) return { ok: false, error: 'Learner not found in your school.' }
  if (!cls) return { ok: false, error: 'Class not found in your school.' }

  const { data, error } = await supabase
    .from('black_book_entries')
    .insert({
      school_id: ctx.schoolId,
      teacher_id: ctx.user.id,
      learner_id: payload.learner_id,
      class_id: payload.class_id,
      occurrence_id: payload.occurrence_id ?? null,
      date: payload.date,
      description: payload.description.trim(),
      severity: payload.severity,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  // Notify principal(s) for serious incidents
  if (payload.severity === 'serious') {
    const { data: principals } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', ctx.schoolId)
      .eq('role', 'principal')
    for (const p of principals ?? []) {
      await createNotification({
        userId: p.id,
        schoolId: ctx.schoolId,
        type: 'black_book_serious',
        title: 'Serious incident recorded',
        body: `${ctx.name} recorded a serious behavioral incident.`,
        data: { black_book_entry_id: data.id },
      })
    }
  }

  revalidatePath('/black-book')
  return { ok: true, id: data.id }
}

export async function updateBlackBookEntry(id: string, payload: BlackBookPayload): Promise<Result> {
  const err = validatePayload(payload)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const { data: entry } = await supabase
    .from('black_book_entries')
    .select('teacher_id, school_id, principal_notes')
    .eq('id', id)
    .single()
  if (!entry || entry.school_id !== ctx.schoolId) return { ok: false, error: 'Entry not found.' }
  if (entry.teacher_id !== ctx.user.id) return { ok: false, error: 'You can only edit your own entries.' }
  if (entry.principal_notes) return { ok: false, error: 'Cannot edit an entry that has principal notes.' }

  const { error } = await supabase
    .from('black_book_entries')
    .update({
      description: payload.description.trim(),
      severity: payload.severity,
      date: payload.date,
      occurrence_id: payload.occurrence_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/black-book')
  revalidatePath(`/black-book/${id}`)
  return { ok: true }
}

export async function addPrincipalNotes(id: string, notes: string): Promise<Result> {
  if (notes.trim().length < 5) return { ok: false, error: 'Notes must be at least 5 characters.' }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }
  if (ctx.role !== 'principal') return { ok: false, error: 'Only principals can add principal notes.' }

  const { data: entry } = await supabase
    .from('black_book_entries')
    .select('school_id')
    .eq('id', id)
    .single()
  if (!entry || entry.school_id !== ctx.schoolId) return { ok: false, error: 'Entry not found.' }

  const { error } = await supabase
    .from('black_book_entries')
    .update({ principal_notes: notes.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/black-book/${id}`)
  revalidatePath('/black-book')
  return { ok: true }
}

export async function deleteBlackBookEntry(id: string): Promise<Result> {
  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const { data: entry } = await supabase
    .from('black_book_entries')
    .select('teacher_id, school_id, principal_notes')
    .eq('id', id)
    .single()
  if (!entry || entry.school_id !== ctx.schoolId) return { ok: false, error: 'Entry not found.' }

  // Teachers can delete their own entries only if no principal notes; principal can delete any
  if (!ctx.isLeadership) {
    if (entry.teacher_id !== ctx.user.id) return { ok: false, error: 'You can only delete your own entries.' }
    if (entry.principal_notes) return { ok: false, error: 'Cannot delete an entry with principal notes.' }
  }

  const { error } = await supabase.from('black_book_entries').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/black-book')
  return { ok: true }
}
