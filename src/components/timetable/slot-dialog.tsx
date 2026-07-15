'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { createTimetableSlot, updateTimetableSlot, deleteTimetableSlot } from '@/app/actions/timetable'
import type { TimetableSlot, Class, Subject, Profile } from '@/lib/types/database'

const DAY_LABELS: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday',
}

interface SlotDialogProps {
  mode: 'add' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDay?: number
  defaultPeriod?: number
  slot?: TimetableSlot
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  subjects: Pick<Subject, 'id' | 'name'>[]
  teachers: Pick<Profile, 'id' | 'name' | 'surname'>[]
  isLeadership: boolean
  currentUserId: string
}

const BLANK = {
  class_id: '',
  subject_id: '',
  teacher_id: '',
  day_of_week: '1',
  period: '1',
  start_time: '',
  end_time: '',
}

export function SlotDialog({
  mode,
  open,
  onOpenChange,
  defaultDay,
  defaultPeriod,
  slot,
  classes,
  subjects,
  teachers,
  isLeadership,
  currentUserId,
}: SlotDialogProps) {
  const [fields, setFields] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && slot) {
        setFields({
          class_id: slot.class_id,
          subject_id: slot.subject_id ?? '',
          teacher_id: slot.teacher_id ?? currentUserId,
          day_of_week: String(slot.day_of_week),
          period: String(slot.period),
          start_time: slot.start_time.slice(0, 5),
          end_time: slot.end_time.slice(0, 5),
        })
      } else {
        setFields({
          ...BLANK,
          day_of_week: String(defaultDay ?? 1),
          period: String(defaultPeriod ?? 1),
          teacher_id: currentUserId,
        })
      }
      setError(null)
    }
  }, [open, mode, slot, defaultDay, defaultPeriod, currentUserId])

  function set(key: keyof typeof fields, val: string) {
    setFields((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      class_id: fields.class_id,
      subject_id: fields.subject_id || null,
      teacher_id: fields.teacher_id || null,
      day_of_week: parseInt(fields.day_of_week),
      period: parseInt(fields.period),
      start_time: fields.start_time,
      end_time: fields.end_time,
    }
    const result = mode === 'add'
      ? await createTimetableSlot(payload)
      : await updateTimetableSlot(slot!.id, payload)
    setSaving(false)
    if (result.ok) {
      onOpenChange(false)
    } else {
      setError(result.error)
    }
  }

  async function handleDelete() {
    if (!slot) return
    setDeleting(true)
    const result = await deleteTimetableSlot(slot.id)
    setDeleting(false)
    if (result.ok) {
      onOpenChange(false)
    } else {
      setError(result.error)
    }
  }

  const selectedClass = classes.find((c) => c.id === fields.class_id)
  const selectedSubject = subjects.find((s) => s.id === fields.subject_id)
  const selectedTeacher = teachers.find((t) => t.id === fields.teacher_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add timetable slot' : 'Edit timetable slot'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Day */}
          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select value={fields.day_of_week} onValueChange={(v) => set('day_of_week', v ?? '1')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm">{DAY_LABELS[parseInt(fields.day_of_week)]}</span>
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map((d) => (
                  <SelectItem key={d} value={String(d)}>{DAY_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label>Period</Label>
            <Select value={fields.period} onValueChange={(v) => set('period', v ?? '1')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm">Period {fields.period}</span>
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map((p) => (
                  <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <Label>Class <span className="text-red-500">*</span></Label>
            <Select value={fields.class_id} onValueChange={(v) => set('class_id', v ?? '')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm truncate">
                  {selectedClass ? `${selectedClass.name} (Gr ${selectedClass.grade})` : 'Select class'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} (Gr {c.grade})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={fields.subject_id} onValueChange={(v) => set('subject_id', v ?? '')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm truncate">
                  {selectedSubject ? selectedSubject.name : 'No subject'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No subject</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher — leadership only */}
          {isLeadership && teachers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Teacher</Label>
              <Select value={fields.teacher_id} onValueChange={(v) => set('teacher_id', v ?? '')}>
                <SelectTrigger>
                  <span className="flex-1 text-left text-sm truncate">
                    {selectedTeacher
                      ? `${selectedTeacher.name} ${selectedTeacher.surname}`
                      : 'Select teacher'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} {t.surname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                value={fields.start_time}
                onChange={(e) => set('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                value={fields.end_time}
                onChange={(e) => set('end_time', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving || !fields.class_id || !fields.start_time || !fields.end_time}
              className="flex-1"
            >
              {saving ? 'Saving…' : mode === 'add' ? 'Add slot' : 'Save changes'}
            </Button>
            {mode === 'edit' && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '…' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
