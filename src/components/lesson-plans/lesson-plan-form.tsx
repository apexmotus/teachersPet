'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLessonPlan, updateLessonPlan, submitLessonPlan, approveLessonPlan } from '@/app/actions/lesson-plans'
import type { LessonPlan, Class, Subject } from '@/lib/types/database'

interface Props {
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  subjects: Pick<Subject, 'id' | 'name'>[]
  plan?: LessonPlan | null
  isLeadership?: boolean
}

export function LessonPlanForm({ classes, subjects, plan, isLeadership }: Props) {
  const router = useRouter()
  const isEdit = !!plan
  const isReadOnly = plan?.status === 'approved'

  const [fields, setFields] = useState({
    class_id: plan?.class_id ?? classes[0]?.id ?? '',
    subject_id: plan?.subject_id ?? '',
    date: plan?.date ?? new Date().toISOString().split('T')[0],
    topic: plan?.topic ?? '',
    objectives: plan?.objectives ?? '',
    activities: plan?.activities ?? '',
    resources: plan?.resources ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      class_id: fields.class_id,
      subject_id: fields.subject_id || null,
      date: fields.date,
      topic: fields.topic,
      objectives: fields.objectives || null,
      activities: fields.activities || null,
      resources: fields.resources || null,
    }

    const result = isEdit
      ? await updateLessonPlan(plan!.id, payload)
      : await createLessonPlan(payload)

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (!isEdit && result.ok && 'id' in result) {
      router.push(`/lesson-plans/${result.id}`)
    }
  }

  async function handleSubmit() {
    if (!plan) return
    setSubmitting(true)
    setError(null)
    const result = await submitLessonPlan(plan.id)
    setSubmitting(false)
    if (!result.ok) setError(result.error)
  }

  async function handleApprove() {
    if (!plan) return
    setApproving(true)
    setError(null)
    const result = await approveLessonPlan(plan.id)
    setApproving(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          This plan has been approved and is read-only.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Class *</Label>
          <Select value={fields.class_id} onValueChange={(v) => set('class_id', v ?? '')} disabled={isReadOnly}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm truncate">
                {classes.find((c) => c.id === fields.class_id)
                  ? `${classes.find((c) => c.id === fields.class_id)!.name} Gr ${classes.find((c) => c.id === fields.class_id)!.grade}`
                  : 'Select class'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} Gr {c.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select value={fields.subject_id || 'none'} onValueChange={(v) => set('subject_id', !v || v === 'none' ? '' : v)} disabled={isReadOnly}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm truncate">
                {subjects.find((s) => s.id === fields.subject_id)?.name ?? 'None'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={fields.date}
            onChange={(e) => set('date', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic">Topic *</Label>
          <Input
            id="topic"
            placeholder="Lesson topic"
            value={fields.topic}
            onChange={(e) => set('topic', e.target.value)}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="objectives">Objectives</Label>
        <Textarea
          id="objectives"
          placeholder="By the end of this lesson, learners will be able to…"
          value={fields.objectives}
          onChange={(e) => set('objectives', e.target.value)}
          rows={3}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activities">Activities</Label>
        <Textarea
          id="activities"
          placeholder="Teaching and learning activities…"
          value={fields.activities}
          onChange={(e) => set('activities', e.target.value)}
          rows={3}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resources">Resources</Label>
        <Textarea
          id="resources"
          placeholder="Textbooks, worksheets, materials…"
          value={fields.resources}
          onChange={(e) => set('resources', e.target.value)}
          rows={2}
          disabled={isReadOnly}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>

        {!isReadOnly && (
          <Button onClick={handleSave} disabled={saving || submitting}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create draft'}
          </Button>
        )}

        {isEdit && plan?.status === 'draft' && !isLeadership && (
          <Button
            variant="secondary"
            onClick={handleSubmit}
            disabled={submitting || saving}
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        )}

        {isEdit && plan?.status === 'submitted' && isLeadership && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? 'Approving…' : 'Approve'}
          </Button>
        )}
      </div>
    </div>
  )
}
