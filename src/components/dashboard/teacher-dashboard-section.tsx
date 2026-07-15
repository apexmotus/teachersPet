import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CalendarDays, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { TimetableSlot, LessonOccurrence } from '@/lib/types/database'

type SlotRow = TimetableSlot & {
  classes: { name: string; grade: number } | null
  subjects: { name: string } | null
}

interface TeacherDashboardSectionProps {
  todaySlots: SlotRow[]
  todayOccurrences: Pick<LessonOccurrence, 'timetable_slot_id' | 'lesson_plan_id' | 'status'>[]
  classesWithRegister: string[]
  teacherClasses: { id: string; name: string; grade: number }[]
  isWeekend: boolean
}

const DAY_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIOD_TIMES: Record<number, string> = {
  1: '07:30', 2: '08:15', 3: '09:00', 4: '09:45',
  5: '10:45', 6: '11:30', 7: '12:15', 8: '13:00',
}

export function TeacherDashboardSection({
  todaySlots,
  todayOccurrences,
  classesWithRegister,
  teacherClasses,
  isWeekend,
}: TeacherDashboardSectionProps) {
  const occurrenceMap = new Map(todayOccurrences.map((o) => [o.timetable_slot_id, o]))
  const registerSet = new Set(classesWithRegister)

  if (isWeekend) {
    return (
      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="py-4 px-5">
          <p className="text-sm text-blue-700 font-medium">It&apos;s the weekend — enjoy your rest!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Today's schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todaySlots.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">No timetable set up yet.</p>
              <Link href="/timetable" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Build your timetable
              </Link>
            </div>
          ) : (
            todaySlots.map((slot) => {
              const occ = occurrenceMap.get(slot.id)
              const hasPlan = !!occ?.lesson_plan_id
              return (
                <div
                  key={slot.id}
                  className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      P{slot.period} — {slot.classes?.name ?? 'Unknown class'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {slot.subjects?.name ?? 'No subject'} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!hasPlan && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                        No plan
                      </span>
                    )}
                    <Link
                      href={`/attendance?class_id=${slot.class_id}`}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Take register
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Register completion */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Register Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teacherClasses.length === 0 ? (
            <p className="text-sm text-gray-400">No classes assigned.</p>
          ) : (
            teacherClasses.map((cls) => {
              const done = registerSet.has(cls.id)
              return (
                <div key={cls.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{cls.name}</p>
                    <p className="text-xs text-gray-400">Grade {cls.grade}</p>
                  </div>
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
