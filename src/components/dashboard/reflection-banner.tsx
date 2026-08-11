'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createReflection } from '@/app/actions/reflections'
import type { Reflection } from '@/lib/types/database'

interface ReflectionBannerProps {
  todayReflection: Pick<Reflection, 'id' | 'notes'> | null
  date: string
  showPrompt: boolean
}

export function ReflectionBanner({ todayReflection, date, showPrompt }: ReflectionBannerProps) {
  const [saved, setSaved] = useState(todayReflection !== null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (saved) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Today&apos;s reflection saved.</span>
      </div>
    )
  }

  if (!showPrompt) return null

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const result = await createReflection(date, notes)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-amber-800">
        End-of-day reflection — how did today go?
      </p>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Share a brief reflection on today's teaching…"
        rows={3}
        className="bg-white text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={saving || notes.trim().length < 10}
      >
        {saving ? 'Saving…' : 'Save reflection'}
      </Button>
    </div>
  )
}
