'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OccurrenceStatus } from '@/lib/types/database'

type Result = { ok: true } | { ok: false; error: string }
type OccurrenceResult = { ok: true; id: string } | { ok: false; error: string }

const LEADERSHIP = ['dh', 'dp', 'principal']

interface SlotPayload {
  class_id: string
  subject_id?: string | null
  teacher_id?: string | null
  day_of_week: number
  period: number
  start_time: string
  end_time: string
}

function validateSlot(p: SlotPayload): string | null {
  if (!p.class_id) return 'Class is required.'
  if (p.day_of_week < 1 || p.day_of_week > 5) return 'Day of week must be Monday–Friday (1–5).'
  if (p.period < 1 || p.period > 8) return 'Period must be between 1 and 8.'
  if (!p.start_time || !p.end_time) return 'Start and end times are required.'
  if (p.start_time >= p.end_time) return 'End time must be after start time.'
  return null
}

async function getAuthCtx(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return null
  return { user, schoolId: profile.school_id, role: profile.role, isLeadership: LEADERSHIP.includes(profile.role) }
}

export async function createTimetableSlot(payload: SlotPayload): Promise<Result> {
  const err = validateSlot(payload)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  // Teachers can only create slots for themselves
  const teacherId = ctx.isLeadership
    ? (payload.teacher_id ?? ctx.user.id)
    : ctx.user.id

  const { error } = await supabase.from('timetable_slots').insert({
    school_id: ctx.schoolId,
    class_id: payload.class_id,
    subject_id: payload.subject_id ?? null,
    teacher_id: teacherId,
    day_of_week: payload.day_of_week,
    period: payload.period,
    start_time: payload.start_time,
    end_time: payload.end_time,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/timetable')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function updateTimetableSlot(id: string, payload: SlotPayload): Promise<Result> {
  const err = validateSlot(payload)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  // Verify slot belongs to this school
  const { data: slot } = await supabase
    .from('timetable_slots')
    .select('teacher_id, school_id')
    .eq('id', id)
    .single()
  if (!slot || slot.school_id !== ctx.schoolId) return { ok: false, error: 'Slot not found.' }
  if (!ctx.isLeadership && slot.teacher_id !== ctx.user.id) {
    return { ok: false, error: 'You can only edit your own timetable slots.' }
  }

  const teacherId = ctx.isLeadership
    ? (payload.teacher_id ?? slot.teacher_id)
    : ctx.user.id

  const { error } = await supabase
    .from('timetable_slots')
    .update({
      class_id: payload.class_id,
      subject_id: payload.subject_id ?? null,
      teacher_id: teacherId,
      day_of_week: payload.day_of_week,
      period: payload.period,
      start_time: payload.start_time,
      end_time: payload.end_time,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/timetable')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function deleteTimetableSlot(id: string): Promise<Result> {
  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const { data: slot } = await supabase
    .from('timetable_slots')
    .select('teacher_id, school_id')
    .eq('id', id)
    .single()
  if (!slot || slot.school_id !== ctx.schoolId) return { ok: false, error: 'Slot not found.' }
  if (!ctx.isLeadership && slot.teacher_id !== ctx.user.id) {
    return { ok: false, error: 'You can only delete your own timetable slots.' }
  }

  const { error } = await supabase.from('timetable_slots').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/timetable')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function upsertLessonOccurrence(
  slotId: string,
  date: string,
): Promise<OccurrenceResult> {
  const today = new Date().toISOString().split('T')[0]
  if (date !== today) return { ok: false, error: 'Occurrences can only be created for today.' }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  // Verify slot belongs to school and caller is the teacher (or leadership)
  const { data: slot } = await supabase
    .from('timetable_slots')
    .select('teacher_id, school_id')
    .eq('id', slotId)
    .single()
  if (!slot || slot.school_id !== ctx.schoolId) return { ok: false, error: 'Slot not found.' }
  if (!ctx.isLeadership && slot.teacher_id !== ctx.user.id) {
    return { ok: false, error: 'Not your timetable slot.' }
  }

  const { data, error } = await supabase
    .from('lesson_occurrences')
    .upsert(
      { school_id: ctx.schoolId, timetable_slot_id: slotId, date, status: 'upcoming' },
      { onConflict: 'timetable_slot_id,date', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/timetable')
  revalidatePath('/dashboard')
  return { ok: true, id: data.id }
}

export async function setOccurrenceStatus(
  occurrenceId: string,
  status: OccurrenceStatus,
): Promise<Result> {
  const VALID_TRANSITIONS: Record<OccurrenceStatus, OccurrenceStatus[]> = {
    upcoming: ['active'],
    active: ['completed'],
    completed: [],
  }

  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const { data: occ } = await supabase
    .from('lesson_occurrences')
    .select('status, school_id')
    .eq('id', occurrenceId)
    .single()
  if (!occ || occ.school_id !== ctx.schoolId) return { ok: false, error: 'Occurrence not found.' }

  const allowed = VALID_TRANSITIONS[occ.status as OccurrenceStatus]
  if (!allowed.includes(status)) {
    return { ok: false, error: `Cannot transition from ${occ.status} to ${status}.` }
  }

  const { error } = await supabase
    .from('lesson_occurrences')
    .update({ status })
    .eq('id', occurrenceId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/timetable')
  return { ok: true }
}

export async function attachLessonPlanToOccurrence(
  occurrenceId: string,
  lessonPlanId: string,
): Promise<Result> {
  const supabase = await createClient()
  const ctx = await getAuthCtx(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  // Verify both belong to school
  const [{ data: occ }, { data: plan }] = await Promise.all([
    supabase.from('lesson_occurrences').select('timetable_slot_id, school_id').eq('id', occurrenceId).single(),
    supabase.from('lesson_plans').select('school_id, teacher_id').eq('id', lessonPlanId).single(),
  ])
  if (!occ || occ.school_id !== ctx.schoolId) return { ok: false, error: 'Occurrence not found.' }
  if (!plan || plan.school_id !== ctx.schoolId) return { ok: false, error: 'Lesson plan not found.' }

  // Non-leadership can only attach plans they own
  if (!ctx.isLeadership && plan.teacher_id !== ctx.user.id) {
    return { ok: false, error: 'You can only attach your own lesson plans.' }
  }

  const { error } = await supabase
    .from('lesson_occurrences')
    .update({ lesson_plan_id: lessonPlanId })
    .eq('id', occurrenceId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/timetable')
  revalidatePath('/lesson-plans')
  return { ok: true }
}
