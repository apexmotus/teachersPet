'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

type Result = { ok: true } | { ok: false; error: string }
type CreateResult = { ok: true; id: string } | { ok: false; error: string }

interface LessonPlanPayload {
  class_id: string
  subject_id?: string | null
  date: string
  topic: string
  objectives?: string | null
  activities?: string | null
  resources?: string | null
}

function validate(payload: LessonPlanPayload): string | null {
  if (!payload.class_id) return 'Class is required.'
  if (!payload.date) return 'Date is required.'
  if (!payload.topic.trim()) return 'Topic is required.'
  return null
}

async function getAuthContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return null

  return { user, profile: { ...profile, school_id: profile.school_id! } }
}

export async function createLessonPlan(payload: LessonPlanPayload): Promise<CreateResult> {
  const validationError = validate(payload)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createClient()
  const ctx = await getAuthContext(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const { data: cls } = await supabase
    .from('classes')
    .select('id')
    .eq('id', payload.class_id)
    .eq('school_id', ctx.profile.school_id)
    .single()
  if (!cls) return { ok: false, error: 'Invalid class.' }

  const { data, error } = await supabase
    .from('lesson_plans')
    .insert({
      teacher_id: ctx.user.id,
      school_id: ctx.profile.school_id,
      class_id: payload.class_id,
      subject_id: payload.subject_id ?? null,
      date: payload.date,
      topic: payload.topic.trim(),
      objectives: payload.objectives?.trim() || null,
      activities: payload.activities?.trim() || null,
      resources: payload.resources?.trim() || null,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/lesson-plans')
  return { ok: true, id: data.id }
}

export async function updateLessonPlan(id: string, payload: LessonPlanPayload): Promise<Result> {
  const validationError = validate(payload)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createClient()
  const ctx = await getAuthContext(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  // Fetch current plan to check status
  const { data: plan } = await supabase
    .from('lesson_plans')
    .select('status, teacher_id')
    .eq('id', id)
    .single()
  if (!plan) return { ok: false, error: 'Lesson plan not found.' }
  if (plan.teacher_id !== ctx.user.id) return { ok: false, error: 'Not your lesson plan.' }
  if (plan.status === 'approved') return { ok: false, error: 'Approved plans cannot be edited.' }

  const { error } = await supabase
    .from('lesson_plans')
    .update({
      class_id: payload.class_id,
      subject_id: payload.subject_id ?? null,
      date: payload.date,
      topic: payload.topic.trim(),
      objectives: payload.objectives?.trim() || null,
      activities: payload.activities?.trim() || null,
      resources: payload.resources?.trim() || null,
      // Editing a submitted plan reverts to draft
      status: plan.status === 'submitted' ? 'draft' : plan.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('teacher_id', ctx.user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/lesson-plans')
  revalidatePath(`/lesson-plans/${id}`)
  return { ok: true }
}

export async function submitLessonPlan(id: string): Promise<Result> {
  const supabase = await createClient()
  const ctx = await getAuthContext(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const { data: plan } = await supabase
    .from('lesson_plans')
    .select('status, teacher_id')
    .eq('id', id)
    .single()
  if (!plan) return { ok: false, error: 'Lesson plan not found.' }
  if (plan.teacher_id !== ctx.user.id) return { ok: false, error: 'Not your lesson plan.' }
  if (plan.status !== 'draft') return { ok: false, error: 'Only draft plans can be submitted.' }

  const { error } = await supabase
    .from('lesson_plans')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('teacher_id', ctx.user.id)

  if (error) return { ok: false, error: error.message }

  // Notify all leadership in the school
  const { data: leaders } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', ctx.profile.school_id)
    .in('role', ['dh', 'dp', 'principal'])
  for (const leader of leaders ?? []) {
    await createNotification({
      userId: leader.id,
      schoolId: ctx.profile.school_id,
      type: 'lesson_plan_submitted',
      title: 'Lesson plan submitted for review',
      body: `A lesson plan has been submitted for your review.`,
      data: { lesson_plan_id: id },
    })
  }

  revalidatePath('/lesson-plans')
  revalidatePath(`/lesson-plans/${id}`)
  return { ok: true }
}

export async function approveLessonPlan(id: string): Promise<Result> {
  const supabase = await createClient()
  const ctx = await getAuthContext(supabase)
  if (!ctx) return { ok: false, error: 'Not authenticated or no school.' }

  const isLeadership = ['dh', 'dp', 'principal'].includes(ctx.profile.role)
  if (!isLeadership) return { ok: false, error: 'Only leadership can approve lesson plans.' }

  const { data: plan } = await supabase
    .from('lesson_plans')
    .select('status, teacher_id, topic')
    .eq('id', id)
    .single()
  if (!plan) return { ok: false, error: 'Lesson plan not found.' }
  if (plan.status !== 'submitted') return { ok: false, error: 'Only submitted plans can be approved.' }

  const { error } = await supabase
    .from('lesson_plans')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  // Notify the plan's author
  await createNotification({
    userId: plan.teacher_id,
    schoolId: ctx.profile.school_id,
    type: 'lesson_plan_approved',
    title: 'Lesson plan approved',
    body: `Your lesson plan "${plan.topic}" has been approved.`,
    data: { lesson_plan_id: id },
  })

  revalidatePath('/lesson-plans')
  revalidatePath(`/lesson-plans/${id}`)
  return { ok: true }
}
