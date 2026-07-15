import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimetableGrid } from '@/components/timetable/timetable-grid'
import type { TimetableSlot, Profile, LessonOccurrence } from '@/lib/types/database'
import Link from 'next/link'

const LEADERSHIP = ['dh', 'dp', 'principal']

type SlotRow = TimetableSlot & {
  classes: { name: string; grade: number } | null
  subjects: { name: string } | null
  profiles: { name: string; surname: string } | null
}

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role, name, surname')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) redirect('/login')

  const isLeadership = LEADERSHIP.includes(profile.role)
  const sp = await searchParams
  const selectedTeacherId = isLeadership ? (sp.teacher ?? null) : user.id

  const todayDow = (() => {
    const d = new Date().getDay()
    return d >= 1 && d <= 5 ? d : null
  })()
  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch in parallel
  const [
    { data: rawSlots },
    { data: classes },
    { data: subjects },
    { data: allTeachers },
    { data: rawOcc },
  ] = await Promise.all([
    supabase
      .from('timetable_slots')
      .select('*, classes(name, grade), subjects(name), profiles(name, surname)')
      .eq('school_id', profile.school_id)
      .order('day_of_week')
      .order('period'),
    supabase
      .from('classes')
      .select('id, name, grade')
      .eq('school_id', profile.school_id)
      .order('grade'),
    supabase
      .from('subjects')
      .select('id, name')
      .eq('school_id', profile.school_id)
      .order('name'),
    isLeadership
      ? supabase
          .from('profiles')
          .select('id, name, surname, role')
          .eq('school_id', profile.school_id)
          .order('surname')
      : Promise.resolve({ data: [] }),
    todayDow
      ? supabase
          .from('lesson_occurrences')
          .select('timetable_slot_id, lesson_plan_id, status')
          .eq('school_id', profile.school_id)
          .eq('date', todayStr)
      : Promise.resolve({ data: [] }),
  ])

  // Cast join types
  const allSlots = (rawSlots ?? []) as SlotRow[]

  // Filter slots for the view
  const visibleSlots = selectedTeacherId
    ? allSlots.filter((s) => s.teacher_id === selectedTeacherId)
    : allSlots

  const todayOccurrences = (rawOcc ?? []) as Pick<
    LessonOccurrence, 'timetable_slot_id' | 'lesson_plan_id' | 'status'
  >[]
  const teachers = (allTeachers ?? []) as Pick<Profile, 'id' | 'name' | 'surname'>[]

  // Viewing label
  let viewingLabel = 'My Timetable'
  if (isLeadership && selectedTeacherId && selectedTeacherId !== user.id) {
    const t = teachers.find((t) => t.id === selectedTeacherId)
    viewingLabel = t ? `${t.name} ${t.surname}'s Timetable` : 'Timetable'
  } else if (isLeadership && !selectedTeacherId) {
    viewingLabel = 'All Timetables'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">{viewingLabel}</p>
      </div>

      {/* Leadership teacher selector */}
      {isLeadership && teachers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/timetable"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedTeacherId
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </Link>
          {teachers.map((t) => (
            <Link
              key={t.id}
              href={`/timetable?teacher=${t.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedTeacherId === t.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.name} {t.surname}
            </Link>
          ))}
        </div>
      )}

      {/* Legend for today */}
      {todayDow && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Lesson plan attached
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            No lesson plan
          </span>
        </div>
      )}

      <TimetableGrid
        slots={visibleSlots}
        classes={classes ?? []}
        subjects={subjects ?? []}
        teachers={teachers}
        todayOccurrences={todayOccurrences}
        isLeadership={isLeadership}
        currentUserId={user.id}
        todayDow={todayDow}
      />
    </div>
  )
}
