import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BlackBookForm } from '@/components/black-book/black-book-form'
import type { LessonOccurrence } from '@/lib/types/database'

export default async function NewBlackBookPage({
  searchParams,
}: {
  searchParams: Promise<{ learner_id?: string; class_id?: string; occurrence_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) redirect('/login')

  const isLeadership = ['dh', 'dp', 'principal'].includes(profile.role)
  const sp = await searchParams
  const todayStr = new Date().toISOString().split('T')[0]

  const [{ data: classes }, { data: learners }, { data: rawOcc }] = await Promise.all([
    supabase.from('classes').select('id, name, grade').eq('school_id', profile.school_id).order('grade'),
    supabase.from('learners').select('id, name, surname, class_id').eq('school_id', profile.school_id).order('surname'),
    supabase
      .from('lesson_occurrences')
      .select('id, date, timetable_slot_id')
      .eq('school_id', profile.school_id)
      .eq('date', todayStr),
  ])

  const todayOccurrences = (rawOcc ?? []) as Pick<LessonOccurrence, 'id' | 'date' | 'timetable_slot_id'>[]

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Record Incident</h1>
      <BlackBookForm
        classes={classes ?? []}
        learners={learners ?? []}
        todayOccurrences={todayOccurrences}
        defaultLearnerId={sp.learner_id}
        defaultClassId={sp.class_id}
        defaultOccurrenceId={sp.occurrence_id}
        isLeadership={isLeadership}
      />
    </div>
  )
}
