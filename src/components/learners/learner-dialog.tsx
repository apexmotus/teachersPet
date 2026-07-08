'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { createLearner, updateLearner } from '@/app/actions/learners'
import type { Learner, Class } from '@/lib/types/database'

interface Props {
  open: boolean
  onClose: () => void
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  learner?: Learner | null
}

type Nationality = 'SA' | 'other'

const EMPTY = {
  name: '',
  surname: '',
  class_id: '',
  nationality: 'SA' as Nationality,
  id_number: '',
  date_of_birth: '',
  parent_contact: '',
}

/** Derive YYYY-MM-DD from first 6 digits of a SA ID number (YYMMDD). */
function dobFromSAId(id: string): string {
  if (id.length < 6) return ''
  const yy = id.slice(0, 2)
  const mm = id.slice(2, 4)
  const dd = id.slice(4, 6)
  const mmNum = parseInt(mm, 10)
  const ddNum = parseInt(dd, 10)
  if (mmNum < 1 || mmNum > 12 || ddNum < 1 || ddNum > 31) return ''
  const currentYY = new Date().getFullYear() % 100
  const yyyy = parseInt(yy, 10) <= currentYY ? `20${yy}` : `19${yy}`
  return `${yyyy}-${mm}-${dd}`
}

export function LearnerDialog({ open, onClose, classes, learner }: Props) {
  const [fields, setFields] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (learner) {
      const hasSAId = !!learner.id_number && /^\d{13}$/.test(learner.id_number)
      setFields({
        name: learner.name,
        surname: learner.surname,
        class_id: learner.class_id,
        nationality: hasSAId ? 'SA' : 'other',
        id_number: learner.id_number ?? '',
        date_of_birth: learner.date_of_birth ?? '',
        parent_contact: learner.parent_contact ?? '',
      })
    } else {
      setFields({ ...EMPTY, class_id: classes[0]?.id ?? '' })
    }
    setError(null)
  }, [learner, open, classes])

  function set<K extends keyof typeof EMPTY>(key: K, value: typeof EMPTY[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function handleIdNumberChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 13)
    const derivedDob = dobFromSAId(digits)
    setFields((prev) => ({
      ...prev,
      id_number: digits,
      date_of_birth: derivedDob || prev.date_of_birth,
    }))
    setError(null)
  }

  function handleNationalityChange(nat: Nationality) {
    setFields((prev) => ({
      ...prev,
      nationality: nat,
      id_number: '',
      date_of_birth: '',
    }))
    setError(null)
  }

  const selectedClass = classes.find((c) => c.id === fields.class_id)
  const isSA = fields.nationality === 'SA'

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      name: fields.name,
      surname: fields.surname,
      class_id: fields.class_id,
      id_number: isSA ? (fields.id_number || null) : null,
      date_of_birth: fields.date_of_birth || null,
      parent_contact: fields.parent_contact || null,
    }
    const result = learner
      ? await updateLearner(learner.id, payload)
      : await createLearner(payload)

    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{learner ? 'Edit learner' : 'Add learner'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + Surname */}
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

          {/* Class */}
          <div className="space-y-1.5">
            <Label>Class *</Label>
            <Select value={fields.class_id} onValueChange={(v) => set('class_id', v ?? '')}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm truncate">
                  {selectedClass ? `${selectedClass.name} — Gr ${selectedClass.grade}` : 'Select class'}
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

          {/* Nationality toggle */}
          <div className="space-y-1.5">
            <Label>Nationality</Label>
            <div className="flex gap-2">
              {(['SA', 'other'] as Nationality[]).map((nat) => (
                <button
                  key={nat}
                  type="button"
                  onClick={() => handleNationalityChange(nat)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    fields.nationality === nat
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                >
                  {nat === 'SA' ? 'South African' : 'Other'}
                </button>
              ))}
            </div>
          </div>

          {/* SA: ID number → auto-fills DOB */}
          {isSA ? (
            <div className="space-y-1.5">
              <Label htmlFor="id_number">SA ID number</Label>
              <Input
                id="id_number"
                placeholder="13 digits"
                inputMode="numeric"
                value={fields.id_number}
                onChange={(e) => handleIdNumberChange(e.target.value)}
                maxLength={13}
              />
              {fields.date_of_birth && (
                <p className="text-xs text-gray-500">
                  Date of birth: {new Date(fields.date_of_birth + 'T00:00:00').toLocaleDateString('en-ZA', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </div>
          ) : (
            /* Non-SA: manual DOB */
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
          )}

          {/* Parent contact */}
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
