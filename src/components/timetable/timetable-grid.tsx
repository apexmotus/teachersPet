'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SlotDialog } from './slot-dialog'
import type { TimetableSlot, Class, Subject, Profile, LessonOccurrence } from '@/lib/types/database'

const DAYS: { dow: number; label: string; short: string }[] = [
  { dow: 1, label: 'Monday',    short: 'Mon' },
  { dow: 2, label: 'Tuesday',   short: 'Tue' },
  { dow: 3, label: 'Wednesday', short: 'Wed' },
  { dow: 4, label: 'Thursday',  short: 'Thu' },
  { dow: 5, label: 'Friday',    short: 'Fri' },
]

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

type SlotRow = TimetableSlot & {
  classes: { name: string; grade: number } | null
  subjects: { name: string } | null
  profiles: { name: string; surname: string } | null
}

interface TimetableGridProps {
  slots: SlotRow[]
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  subjects: Pick<Subject, 'id' | 'name'>[]
  teachers: Pick<Profile, 'id' | 'name' | 'surname'>[]
  todayOccurrences: Pick<LessonOccurrence, 'timetable_slot_id' | 'lesson_plan_id'>[]
  isLeadership: boolean
  currentUserId: string
  todayDow: number | null
}

export function TimetableGrid({
  slots,
  classes,
  subjects,
  teachers,
  todayOccurrences,
  isLeadership,
  currentUserId,
  todayDow,
}: TimetableGridProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ day: number; period: number } | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotRow | null>(null)

  // Build a map for quick lookup: "dow-period" → slot
  const slotMap = new Map<string, SlotRow>()
  for (const s of slots) {
    slotMap.set(`${s.day_of_week}-${s.period}`, s)
  }

  const occurrenceMap = new Map(todayOccurrences.map((o) => [o.timetable_slot_id, o]))

  function handleCellClick(dow: number, period: number) {
    const existing = slotMap.get(`${dow}-${period}`)
    if (existing) {
      setSelectedSlot(existing)
      setEditOpen(true)
    } else {
      setSelectedCell({ day: dow, period })
      setAddOpen(true)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-16 px-2 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-200">
                Period
              </th>
              {DAYS.map(({ dow, label, short }) => (
                <th
                  key={dow}
                  className={`px-2 py-2 text-center text-xs font-semibold border-b border-gray-200 ${
                    todayDow === dow ? 'text-primary bg-primary/5' : 'text-gray-600'
                  }`}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                  {todayDow === dow && (
                    <span className="ml-1 text-[9px] bg-primary text-white px-1 py-0.5 rounded">Today</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period} className="border-b border-gray-100 last:border-0">
                <td className="px-2 py-1 text-xs text-gray-400 font-medium">P{period}</td>
                {DAYS.map(({ dow }) => {
                  const slot = slotMap.get(`${dow}-${period}`)
                  const occ = slot ? occurrenceMap.get(slot.id) : undefined
                  const hasPlan = !!occ?.lesson_plan_id
                  const isToday = todayDow === dow

                  return (
                    <td
                      key={dow}
                      className={`px-1.5 py-1 min-w-[100px] cursor-pointer transition-colors ${
                        isToday ? 'bg-primary/5' : ''
                      } ${slot ? 'hover:bg-gray-50' : 'hover:bg-gray-50/80'}`}
                      onClick={() => handleCellClick(dow, period)}
                    >
                      {slot ? (
                        <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 space-y-0.5 group">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
                              {slot.classes?.name ?? 'Class'}
                            </p>
                            {/* Plan status dot — only shown for today */}
                            {isToday && (
                              <span
                                className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${
                                  hasPlan ? 'bg-green-400' : 'bg-amber-400'
                                }`}
                                title={hasPlan ? 'Lesson plan attached' : 'No lesson plan'}
                              />
                            )}
                          </div>
                          {slot.subjects?.name && (
                            <p className="text-[10px] text-gray-400 truncate">{slot.subjects.name}</p>
                          )}
                          <p className="text-[10px] text-gray-300">
                            {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          </p>
                          {isLeadership && slot.profiles && (
                            <p className="text-[10px] text-gray-400 truncate">
                              {slot.profiles.name} {slot.profiles.surname}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-10 rounded-md border border-dashed border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add dialog */}
      <SlotDialog
        mode="add"
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultDay={selectedCell?.day}
        defaultPeriod={selectedCell?.period}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        isLeadership={isLeadership}
        currentUserId={currentUserId}
      />

      {/* Edit dialog */}
      <SlotDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        slot={selectedSlot ?? undefined}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        isLeadership={isLeadership}
        currentUserId={currentUserId}
      />
    </>
  )
}
