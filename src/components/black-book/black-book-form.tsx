'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { createBlackBookEntry } from '@/app/actions/black-book'
import type { Class, Learner, LessonOccurrence, BlackBookSeverity } from '@/lib/types/database'

interface BlackBookFormProps {
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  learners: Pick<Learner, 'id' | 'name' | 'surname' | 'class_id'>[]
  todayOccurrences: Pick<LessonOccurrence, 'id' | 'date' | 'timetable_slot_id'>[]
  defaultLearnerId?: string
  defaultClassId?: string
  defaultOccurrenceId?: string
  isLeadership: boolean
}

const today = new Date().toISOString().split('T')[0]

export function BlackBookForm({
  classes,
  learners,
  todayOccurrences,
  defaultLearnerId,
  defaultClassId,
  defaultOccurrenceId,
  isLeadership,
}: BlackBookFormProps) {
  const router = useRouter()
  const [fields, setFields] = useState({
    class_id: defaultClassId ?? '',
    learner_id: defaultLearnerId ?? '',
    date: today,
    description: '',
    severity: 'minor' as BlackBookSeverity,
    occurrence_id: defaultOccurrenceId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof fields>(key: K, val: typeof fields[K]) {
    setFields((prev) => {
      const next = { ...prev, [key]: val }
      // If class changes, reset learner
      if (key === 'class_id') next.learner_id = ''
      return next
    })
  }

  const filteredLearners = fields.class_id
    ? learners.filter((l) => l.class_id === fields.class_id)
    : learners

  const selectedClass = classes.find((c) => c.id === fields.class_id)
  const selectedLearner = learners.find((l) => l.id === fields.learner_id)
  const selectedSeverity = { minor: 'Minor', moderate: 'Moderate', serious: 'Serious' }[fields.severity]

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const result = await createBlackBookEntry({
      learner_id: fields.learner_id,
      class_id: fields.class_id,
      date: fields.date,
      description: fields.description,
      severity: fields.severity,
      occurrence_id: fields.occurrence_id || null,
    })
    setSaving(false)
    if (result.ok) {
      router.push(`/black-book/${result.id}`)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="space-y-5">
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

      {/* Learner */}
      <div className="space-y-1.5">
        <Label>Learner <span className="text-red-500">*</span></Label>
        <Select value={fields.learner_id} onValueChange={(v) => set('learner_id', v ?? '')}>
          <SelectTrigger>
            <span className="flex-1 text-left text-sm truncate">
              {selectedLearner
                ? `${selectedLearner.surname}, ${selectedLearner.name}`
                : 'Select learner'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {filteredLearners.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.surname}, {l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date <span className="text-red-500">*</span></Label>
        <Input
          type="date"
          value={fields.date}
          max={today}
          onChange={(e) => set('date', e.target.value)}
        />
      </div>

      {/* Severity */}
      <div className="space-y-1.5">
        <Label>Severity <span className="text-red-500">*</span></Label>
        <Select value={fields.severity} onValueChange={(v) => set('severity', (v ?? 'minor') as BlackBookSeverity)}>
          <SelectTrigger>
            <span className="flex-1 text-left text-sm">{selectedSeverity}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="serious">Serious</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description <span className="text-red-500">*</span></Label>
        <Textarea
          value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the incident in detail…"
          rows={4}
        />
        <p className="text-xs text-gray-400">{fields.description.trim().length} / 5 chars minimum</p>
      </div>

      {/* Link to lesson (optional) */}
      {todayOccurrences.length > 0 && (
        <div className="space-y-1.5">
          <Label>Link to today&apos;s lesson (optional)</Label>
          <Select value={fields.occurrence_id} onValueChange={(v) => set('occurrence_id', v ?? '')}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm truncate">
                {fields.occurrence_id ? 'Lesson selected' : 'Not linked to a lesson'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not linked</SelectItem>
              {todayOccurrences.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  Lesson {o.timetable_slot_id.slice(0, 8)}…
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={saving || !fields.learner_id || !fields.class_id || fields.description.trim().length < 5}
        className="w-full"
      >
        {saving ? 'Saving…' : 'Record incident'}
      </Button>
    </div>
  )
}
