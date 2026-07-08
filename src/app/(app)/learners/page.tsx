import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LearnersTable } from '@/components/learners/learners-table'
import type { Learner } from '@/lib/types/database'

type LearnerRow = Learner & { classes: { name: string; grade: number } | null }

export default async function LearnersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Please complete your profile setup before managing learners.</p>
      </div>
    )
  }

  const [{ data: classes }, { data: rawLearners }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, grade')
      .eq('school_id', profile.school_id)
      .order('grade'),
    supabase
      .from('learners')
      .select('*, classes(name, grade)')
      .eq('school_id', profile.school_id)
      .order('surname'),
  ])

  const learners = rawLearners as LearnerRow[] | null

  const learnersWithClass = (learners ?? []).map((l) => ({
    ...l,
    class_name: l.classes?.name,
    class_grade: l.classes?.grade,
    classes: undefined,
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learners</h1>
        <p className="text-sm text-gray-500 mt-1">
          {learnersWithClass.length} learner{learnersWithClass.length !== 1 ? 's' : ''} across{' '}
          {(classes ?? []).length} class{(classes ?? []).length !== 1 ? 'es' : ''}
        </p>
      </div>
      <LearnersTable learners={learnersWithClass} classes={classes ?? []} />
    </div>
  )
}
