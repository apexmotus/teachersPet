import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Megaphone, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'
import type { Profile, TimetableSlot, LessonOccurrence } from '@/lib/types/database'
import { ReflectionBanner } from '@/components/dashboard/reflection-banner'
import { TeacherDashboardSection } from '@/components/dashboard/teacher-dashboard-section'
import { LeadershipDashboardSection } from '@/components/dashboard/leadership-dashboard-section'
import { getTeacherClasses } from '@/lib/queries/classes'

const ROLE_LABELS: Record<string, string> = {
  teacher:   'Teacher',
  dh:        'Departmental Head',
  dp:        'Deputy Principal',
  principal: 'Principal',
}

const LEADERSHIP = ['dh', 'dp', 'principal']
const SOUTH_AFRICA_TIME_ZONE = 'Africa/Johannesburg'

function getSouthAfricanDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function getSouthAfricanDayOfWeek(date: Date) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    weekday: 'short',
  }).format(date)
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 0
}

function getSouthAfricanHour(date: Date) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date))
}

type SlotRow = TimetableSlot & {
  classes: { name: string; grade: number } | null
  subjects: { name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, schools(name)')
    .eq('id', user.id)
    .single()
  if (!profile || !profile.school_id) redirect('/login')
  const schoolId = profile.school_id

  const isLeadership = LEADERSHIP.includes(profile.role)
  const now = new Date()
  const todayStr = getSouthAfricanDate(now)
  const dowJs = getSouthAfricanDayOfWeek(now) // 0=Sun, 6=Sat
  const isWeekend = dowJs === 0 || dowJs === 6
  const todayDow = isWeekend ? null : dowJs // 1=Mon…5=Fri matches DB

  // Base parallel fetches (all roles)
  const [
    { data: announcements },
    { count: learnerCount },
    { data: rawTodayReflection },
  ] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('learners').select('*', { count: 'exact', head: true }),
    supabase
      .from('reflections')
      .select('id, notes')
      .eq('teacher_id', user.id)
      .eq('date', todayStr)
      .maybeSingle(),
  ])

  const todayReflection = rawTodayReflection as Pick<
    import('@/lib/types/database').Reflection, 'id' | 'notes'
  > | null

  // Teacher-specific fetches
  const { classes: teacherClasses } = await getTeacherClasses(
    supabase, user.id, schoolId, profile.role
  )

  let todaySlots: SlotRow[] = []
  let todayOccurrences: Pick<LessonOccurrence, 'timetable_slot_id' | 'lesson_plan_id' | 'status'>[] = []
  let classesWithRegister: string[] = []

  if (todayDow) {
    const [{ data: rawSlots }, { data: rawOcc }] = await Promise.all([
      supabase
        .from('timetable_slots')
        .select('*, classes(name, grade), subjects(name)')
        .eq('school_id', schoolId)
        .eq('teacher_id', user.id)
        .eq('day_of_week', todayDow)
        .order('period'),
      supabase
        .from('lesson_occurrences')
        .select('timetable_slot_id, lesson_plan_id, status')
        .eq('school_id', schoolId)
        .eq('date', todayStr),
    ])
    todaySlots = (rawSlots ?? []) as SlotRow[]
    todayOccurrences = (rawOcc ?? []) as typeof todayOccurrences
  }

  if (teacherClasses.length > 0) {
    const { data: attToday } = await supabase
      .from('attendance')
      .select('class_id')
      .eq('school_id', schoolId)
      .eq('date', todayStr)
      .in('class_id', teacherClasses.map((c) => c.id))
    classesWithRegister = [...new Set((attToday ?? []).map((a) => a.class_id))]
  }

  // Leadership-specific fetches
  let attendancePercent: number | null = null
  let totalAttendanceRecords = 0
  let pendingLessonPlans = 0
  let classesWithNoRegister: { id: string; name: string; grade: number }[] = []

  if (isLeadership) {
    const [
      { count: totalAtt },
      { count: presentAtt },
      { count: pending },
      { data: allClasses },
      { data: classesWithAtt },
    ] = await Promise.all([
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('date', todayStr),
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('date', todayStr)
        .in('status', ['present', 'late']),
      supabase
        .from('lesson_plans')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'submitted'),
      supabase
        .from('classes')
        .select('id, name, grade')
        .eq('school_id', schoolId)
        .order('grade'),
      supabase
        .from('attendance')
        .select('class_id')
        .eq('school_id', schoolId)
        .eq('date', todayStr),
    ])

    totalAttendanceRecords = totalAtt ?? 0
    pendingLessonPlans = pending ?? 0
    if (totalAtt && totalAtt > 0) {
      attendancePercent = Math.round(((presentAtt ?? 0) / totalAtt) * 100)
    }
    const doneSet = new Set((classesWithAtt ?? []).map((a) => a.class_id))
    classesWithNoRegister = (allClasses ?? []).filter((c) => !doneSet.has(c.id))
  }

  const today = now.toLocaleDateString('en-ZA', {
    timeZone: SOUTH_AFRICA_TIME_ZONE,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const quickLinks = [
    { href: '/attendance',    label: 'Take Attendance',  icon: ClipboardList, desc: 'Record today\'s class register' },
    { href: '/announcements', label: 'Announcements',    icon: Megaphone,     desc: 'View school notices' },
    { href: '/learners',      label: 'Learners',         icon: Users,         desc: `${learnerCount ?? 0} in your school` },
    { href: '/lesson-plans',  label: 'Lesson Plans',     icon: BookOpen,      desc: 'Plan and prepare lessons' },
  ]

  const renderReflectionBanner = !isWeekend
  const showReflectionPrompt = getSouthAfricanHour(now) >= 13

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Good day, {profile.name}
          </h1>
          <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
        {(profile as Profile & { schools?: { name: string } }).schools?.name && (
          <p className="text-sm text-gray-400">
            {(profile as Profile & { schools?: { name: string } }).schools?.name}
          </p>
        )}
      </div>

      {/* End-of-day reflection banner (all roles that teach) */}
      {renderReflectionBanner && (
        <ReflectionBanner
          todayReflection={todayReflection}
          date={todayStr}
          showPrompt={showReflectionPrompt}
        />
      )}

      {/* Role-specific dashboard section */}
      {isLeadership ? (
        <LeadershipDashboardSection
          attendancePercent={attendancePercent}
          totalAttendanceRecords={totalAttendanceRecords}
          pendingLessonPlans={pendingLessonPlans}
          classesWithNoRegister={classesWithNoRegister}
          totalClasses={teacherClasses.length}
        />
      ) : (
        <TeacherDashboardSection
          todaySlots={todaySlots}
          todayOccurrences={todayOccurrences}
          classesWithRegister={classesWithRegister}
          teacherClasses={teacherClasses}
          isWeekend={isWeekend}
        />
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickLinks.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-5 pb-4 px-4 flex flex-col gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-sm text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* My classes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teacherClasses && teacherClasses.length > 0 ? (
              teacherClasses.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{cls.name}</span>
                  <Badge variant="outline">Grade {cls.grade}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No classes assigned yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent announcements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements && announcements.length > 0 ? (
              announcements.map((ann) => (
                <div key={ann.id} className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-800">{ann.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(ann.created_at).toLocaleDateString('en-ZA')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No announcements yet.</p>
            )}
            {announcements && announcements.length > 0 && (
              <Link href="/announcements" className="text-xs text-primary hover:underline">
                View all
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
