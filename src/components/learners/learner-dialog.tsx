'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLearner, updateLearner } from '@/app/actions/learners'
import type { Learner, Class } from '@/lib/types/database'

interface Props {
  open: boolean
  onClose: () => void
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  learner?: Learner | null
}

const EMPTY = {
  name: '',
  surname: '',
  class_id: '',
  id_number: '',
  date_of_birth: '',
  parent_contact: '',
}

export function LearnerDialog({ open, onClose, classes, learner }: Props) {
  const [fields, setFields] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (learner) {
      setFields({
        name: learner.name,
        surname: learner.surname,
        class_id: learner.class_id,
        id_number: learner.id_number ?? '',
        date_of_birth: learner.date_of_birth ?? '',
        parent_contact: learner.parent_contact ?? '',
      })
    } else {
      setFields({ ...EMPTY, class_id: classes[0]?.id ?? '' })
    }
    setError(null)
  }, [learner, open, classes])

  function set(key: keyof typeof EMPTY, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      name: fields.name,
      surname: fields.surname,
      class_id: fields.class_id,
      id_number: fields.id_number || null,
      date_of_birth: fields.date_of_birth || null,
      parent_contact: fields.parent_contact || null,
    }
    const result = learner
      ? await updateLearner(learner.id, payload)
      : await createLearner(payload)

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{learner ? 'Edit learner' : 'Add learner'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={fields.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="surname">Surname *</Label>
              <Input id="surname" value={fields.surname} onChange={(e) => set('surname', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Class *</Label>
            <Select value={fields.class_id} onValueChange={(v) => set('class_id', v ?? '')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm truncate">
                  {classes.find((c) => c.id === fields.class_id)
                    ? `${classes.find((c) => c.id === fields.class_id)!.name} — Gr ${classes.find((c) => c.id === fields.class_id)!.grade}`
                    : 'Select class'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — Gr {c.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="id_number">SA ID number</Label>
            <Input
              id="id_number"
              placeholder="13 digits"
              inputMode="numeric"
              value={fields.id_number}
              onChange={(e) => set('id_number', e.target.value.replace(/\D/g, ''))}
              maxLength={13}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={fields.date_of_birth}
              onChange={(e) => set('date_of_birth', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parent_contact">Parent / guardian contact</Label>
            <Input
              id="parent_contact"
              placeholder="Phone or email"
              value={fields.parent_contact}
              onChange={(e) => set('parent_contact', e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : learner ? 'Save changes' : 'Add learner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
