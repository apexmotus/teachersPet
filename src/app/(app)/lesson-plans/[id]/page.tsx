import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTeacherClasses } from '@/lib/queries/classes'
import { LessonPlanForm } from '@/components/lesson-plans/lesson-plan-form'
import { Badge } from '@/components/ui/badge'
import type { LessonPlanStatus } from '@/lib/types/database'

const STATUS_STYLE: Record<LessonPlanStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
}

export default async function LessonPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) redirect('/onboarding')

  const [{ data: plan }, { classes }, { data: subjects }] = await Promise.all([
    supabase.from('lesson_plans').select('*').eq('id', id).single(),
    getTeacherClasses(supabase, user.id, profile.school_id, profile.role),
    supabase.from('subjects').select('id, name').eq('school_id', profile.school_id).order('name'),
  ])

  if (!plan) notFound()

  const isLeadership = ['dh', 'dp', 'principal'].includes(profile.role)
  const isOwner = plan.teacher_id === user.id

  // Teachers can only see their own plans; leadership can see all school plans
  if (!isOwner && !isLeadership) notFound()

  const status = plan.status as LessonPlanStatus

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{plan.topic}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(plan.date + 'T00:00:00').toLocaleDateString('en-ZA', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>
          {status}
        </span>
      </div>

      {plan.status === 'submitted' && isLeadership && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          This plan has been submitted for review. You can approve it below.
        </p>
      )}

      {plan.status === 'submitted' && isOwner && !isLeadership && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          Submitted for review. Editing this plan will revert it to draft.
        </p>
      )}

      <LessonPlanForm
        classes={classes}
        subjects={subjects ?? []}
        plan={plan}
        isLeadership={isLeadership}
      />
    </div>
  )
}
