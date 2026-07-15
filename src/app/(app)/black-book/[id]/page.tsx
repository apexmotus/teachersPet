import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PrincipalNotesEditor } from '@/components/black-book/principal-notes-editor'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { BlackBookEntry } from '@/lib/types/database'

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Minor', moderate: 'Moderate', serious: 'Serious',
}
const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-gray-100 text-gray-600',
  moderate: 'bg-amber-100 text-amber-700',
  serious: 'bg-red-100 text-red-700',
}

type EntryRow = BlackBookEntry & {
  learners: { name: string; surname: string } | null
  classes: { name: string; grade: number } | null
  profiles: { name: string; surname: string } | null
}

export default async function BlackBookEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) redirect('/login')

  const { id } = await params
  const { data: rawEntry } = await supabase
    .from('black_book_entries')
    .select('*, learners(name, surname), classes(name, grade), profiles(name, surname)')
    .eq('id', id)
    .single()

  if (!rawEntry) notFound()
  const entry = rawEntry as EntryRow

  // Access control: teacher sees own, leadership sees all
  const isLeadership = ['dh', 'dp', 'principal'].includes(profile.role)
  const isPrincipal = profile.role === 'principal'
  if (!isLeadership && entry.teacher_id !== user.id) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/black-book" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' -ml-2 mb-2 gap-1'}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Incident — {entry.learners?.surname}, {entry.learners?.name}
          </h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${SEVERITY_COLORS[entry.severity]}`}>
            {SEVERITY_LABELS[entry.severity]}
          </span>
        </div>
      </div>

      {/* Meta */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Learner</p>
              <p className="font-medium text-gray-800">{entry.learners?.surname}, {entry.learners?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Class</p>
              <p className="font-medium text-gray-800">{entry.classes?.name} (Gr {entry.classes?.grade})</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
              <p className="font-medium text-gray-800">{new Date(entry.date).toLocaleDateString('en-ZA')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Recorded by</p>
              <p className="font-medium text-gray-800">
                {entry.profiles?.name} {entry.profiles?.surname}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-800 leading-relaxed">{entry.description}</p>
          </div>

          {entry.severity === 'serious' && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-md px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              This is a serious incident and has been flagged to the principal.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Principal notes */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Principal Notes</h2>
        {isPrincipal ? (
          <PrincipalNotesEditor entryId={entry.id} existingNotes={entry.principal_notes} />
        ) : entry.principal_notes ? (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-gray-800 leading-relaxed">{entry.principal_notes}</p>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-gray-400">No principal notes yet.</p>
        )}
      </div>
    </div>
  )
}
