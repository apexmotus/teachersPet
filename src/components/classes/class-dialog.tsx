'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClass, updateClass } from '@/app/actions/classes'
import type { Class } from '@/lib/types/database'

interface Props {
  open: boolean
  onClose: () => void
  cls?: Class | null
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

const EMPTY = { name: '', grade: '8', year: String(CURRENT_YEAR) }

export function ClassDialog({ open, onClose, cls }: Props) {
  const [fields, setFields] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cls) {
      setFields({ name: cls.name, grade: String(cls.grade), year: String(cls.year) })
    } else {
      setFields(EMPTY)
    }
    setError(null)
  }, [cls, open])

  function set(key: keyof typeof EMPTY, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      name: fields.name,
      grade: parseInt(fields.grade, 10),
      year: parseInt(fields.year, 10),
    }
    const result = cls
      ? await updateClass(cls.id, payload)
      : await createClass(payload)

    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{cls ? 'Edit class' : 'Add class'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cls-name">Class name *</Label>
            <Input
              id="cls-name"
              placeholder="e.g. 8A or Grade 8 Mathematics"
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Grade *</Label>
              <Select value={fields.grade} onValueChange={(v) => set('grade', v ?? fields.grade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Year *</Label>
              <Select value={fields.year} onValueChange={(v) => set('year', v ?? fields.year)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : cls ? 'Save changes' : 'Add class'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
