'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { saveAttendance } from '@/app/actions/attendance'
import type { Class, Learner, AttendanceStatus } from '@/lib/types/database'
import { CheckCircle, XCircle, Clock, Save, MessageSquare, Flag, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AttendanceMap = Record<string, AttendanceStatus>
type NotesMap = Record<string, string>

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'present', label: 'P', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500 hover:bg-green-600 text-white' },
  { value: 'absent',  label: 'A', icon: <XCircle className="w-4 h-4" />,     color: 'bg-red-500 hover:bg-red-600 text-white' },
  { value: 'late',    label: 'L', icon: <Clock className="w-4 h-4" />,        color: 'bg-amber-500 hover:bg-amber-600 text-white' },
]

export function AttendanceSheet({
  classes,
  teacherId,
  schoolId,
  defaultClassId,
}: {
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  teacherId: string
  schoolId: string
  defaultClassId?: string
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [selectedClass, setSelectedClass] = useState<string>(defaultClassId ?? classes[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [learners, setLearners] = useState<Learner[]>([])
  const [attendance, setAttendance] = useState<AttendanceMap>({})
  const [notes, setNotes] = useState<NotesMap>({})
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadingLearners, setLoadingLearners] = useState(false)

  const isWeekend = (() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return d.getDay() === 0 || d.getDay() === 6
  })()

  useEffect(() => {
    if (!selectedClass || !selectedDate) return
    setLoadingLearners(true)
    setSaved(false)
    setSaveError(null)
    const supabase = createClient()

    Promise.all([
      supabase.from('learners').select('*').eq('class_id', selectedClass).order('surname'),
      supabase.from('attendance').select('learner_id, status, notes')
        .eq('class_id', selectedClass)
        .eq('date', selectedDate),
    ]).then(([{ data: l }, { data: a }]) => {
      setLearners(l ?? [])
      const attMap: AttendanceMap = {}
      const notesMap: NotesMap = {}
      a?.forEach((r) => {
        attMap[r.learner_id] = r.status as AttendanceStatus
        if (r.notes) notesMap[r.learner_id] = r.notes
      })
      l?.forEach((learner) => { if (!attMap[learner.id]) attMap[learner.id] = 'present' })
      setAttendance(attMap)
      setNotes(notesMap)
      setOpenNotes({})
      setLoadingLearners(false)
    })
  }, [selectedClass, selectedDate])

  function setStatus(learnerId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [learnerId]: status }))
    setSaved(false)
    setSaveError(null)
  }

  function setNote(learnerId: string, value: string) {
    setNotes((prev) => ({ ...prev, [learnerId]: value }))
    setSaved(false)
    setSaveError(null)
  }

  function toggleNote(learnerId: string) {
    setOpenNotes((prev) => ({ ...prev, [learnerId]: !prev[learnerId] }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const records = Object.entries(attendance).map(([learner_id, status]) => ({
      learner_id,
      status,
      notes: notes[learner_id] ?? null,
    }))
    const result = await saveAttendance(selectedClass, selectedDate, records)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
    } else {
      setSaveError(result.error)
    }
  }

  const presentCount = Object.values(attendance).filter((s) => s === 'present').length
  const absentCount  = Object.values(attendance).filter((s) => s === 'absent').length
  const lateCount    = Object.values(attendance).filter((s) => s === 'late').length

  return (
    <div className="space-y-4">
      {/* Date + class selector row */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => { setSelectedDate(e.target.value); setSaved(false) }}
          className="w-44"
        />
        <div className="flex flex-wrap gap-2">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => { setSelectedClass(cls.id); setSaved(false) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedClass === cls.id
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
              }`}
            >
              {cls.name} <span className="opacity-60">Gr {cls.grade}</span>
            </button>
          ))}
        </div>
      </div>

      {isWeekend && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Weekend date selected — you can still save (e.g. catch-up days).
        </p>
      )}

      {selectedClass && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {classes.find((c) => c.id === selectedClass)?.name} —{' '}
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZA', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600 font-medium">{presentCount} P</span>
                <span className="text-red-500 font-medium">{absentCount} A</span>
                <span className="text-amber-500 font-medium">{lateCount} L</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingLearners ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading learners…</p>
            ) : learners.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No learners in this class yet.</p>
            ) : (
              <>
                <div className="flex gap-2 pb-2 border-b border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      const map: AttendanceMap = {}
                      learners.forEach((l) => { map[l.id] = 'present' })
                      setAttendance(map)
                      setSaved(false)
                    }}
                  >
                    Mark all present
                  </Button>
                </div>

                {learners.map((learner, i) => {
                  const status = attendance[learner.id] ?? 'present'
                  const noteOpen = openNotes[learner.id] ?? false
                  const hasNote = !!(notes[learner.id]?.trim())

                  return (
                    <div key={learner.id} className="border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-800">
                            {learner.surname}, {learner.name}
                          </p>
                        </div>
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => toggleNote(learner.id)}
                            className={`p-1.5 rounded transition-colors ${
                              hasNote || noteOpen
                                ? 'text-primary bg-orange-50'
                                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                            }`}
                            title="Add note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/black-book/new?learner_id=${learner.id}&class_id=${selectedClass}`)}
                            className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Log incident"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(learner.id, opt.value)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                status === opt.value
                                  ? opt.color
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={opt.value}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {noteOpen && (
                        <div className="pl-9 pb-2">
                          <Input
                            placeholder="Add a note…"
                            value={notes[learner.id] ?? ''}
                            onChange={(e) => setNote(learner.id, e.target.value)}
                            className="text-xs h-7"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="pt-3 flex items-center gap-3 justify-end">
                  {saved && <Badge variant="secondary" className="text-green-600">Register saved</Badge>}
                  {saveError && (
                    <p className="text-sm text-red-600 mr-auto">{saveError}</p>
                  )}
                  <a
                    href={`/api/export/attendance?class_id=${selectedClass}&from=${selectedDate}&to=${selectedDate}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Export
                  </a>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save register'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
