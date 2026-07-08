import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTeacherClasses } from '@/lib/queries/classes'
import { LessonPlanForm } from '@/components/lesson-plans/lesson-plan-form'

export default async function NewLessonPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) redirect('/onboarding')

  const [{ classes }, { data: subjects }] = await Promise.all([
    getTeacherClasses(supabase, user.id, profile.school_id, profile.role),
    supabase.from('subjects').select('id, name').eq('school_id', profile.school_id).order('name'),
  ])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New lesson plan</h1>
        <p className="text-sm text-gray-500 mt-1">Saved as a draft — submit when ready for review.</p>
      </div>
      <LessonPlanForm
        classes={classes}
        subjects={subjects ?? []}
        isLeadership={['dh', 'dp', 'principal'].includes(profile.role)}
      />
    </div>
  )
}
