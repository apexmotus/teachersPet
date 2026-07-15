'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { addPrincipalNotes } from '@/app/actions/black-book'

interface PrincipalNotesEditorProps {
  entryId: string
  existingNotes: string | null
}

export function PrincipalNotesEditor({ entryId, existingNotes }: PrincipalNotesEditorProps) {
  const [notes, setNotes] = useState(existingNotes ?? '')
  const [saved, setSaved] = useState(!!existingNotes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await addPrincipalNotes(entryId, notes)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
    } else {
      setError(result.error)
    }
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
          placeholder="Add your notes as principal…"
          rows={4}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || notes.trim().length < 5}
          >
            {saving ? 'Saving…' : saved ? 'Update notes' : 'Save notes'}
          </Button>
          {saved && <p className="text-xs text-green-600">Saved</p>}
        </div>
      </CardContent>
    </Card>
  )
}
