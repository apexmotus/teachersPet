import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BookMarked, Plus, Lock } from 'lucide-react'
import Link from 'next/link'
import type { BlackBookEntry } from '@/lib/types/database'

const PAGE_SIZE = 20
const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Minor', moderate: 'Moderate', serious: 'Serious',
}
const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-gray-100 text-gray-600',
  moderate: 'bg-amber-100 text-amber-700',
  serious: 'bg-red-100 text-red-700',
}

type BlackBookRow = BlackBookEntry & {
  learners: { name: string; surname: string } | null
  classes: { name: string; grade: number } | null
  profiles: { name: string; surname: string } | null
}

export default async function BlackBookPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; severity?: string; class_id?: string }>
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

  const isPrincipal = profile.role === 'principal'
  const isLeadership = ['dh', 'dp', 'principal'].includes(profile.role)
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('black_book_entries')
    .select('*, learners(name, surname), classes(name, grade), profiles(name, surname)', { count: 'exact' })
    .eq('school_id', profile.school_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (!isLeadership) {
    query = query.eq('teacher_id', user.id)
  }
  if (sp.severity) query = query.eq('severity', sp.severity as 'minor' | 'moderate' | 'serious')
  if (sp.class_id) query = query.eq('class_id', sp.class_id)

  const { data: rawData, count } = await query
  const entries = (rawData ?? []) as BlackBookRow[]
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Classes for filter
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, grade')
    .eq('school_id', profile.school_id)
    .order('grade')

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (sp.severity) params.set('severity', sp.severity)
    if (sp.class_id) params.set('class_id', sp.class_id)
    params.set('page', '1')
    Object.entries(overrides).forEach(([k, v]) => params.set(k, v))
    return `/black-book?${params.toString()}`
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookMarked className="w-6 h-6" />
            Black Book
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLeadership ? 'All school incidents' : 'Your recorded incidents'}
          </p>
        </div>
        <Link href="/black-book/new" className={buttonVariants({ size: 'sm' }) + ' gap-2'}>
          <Plus className="w-4 h-4" /> Add entry
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'minor', 'moderate', 'serious'].map((s) => (
          <Link
            key={s || 'all'}
            href={buildUrl({ severity: s, page: '1' })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (sp.severity ?? '') === s
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? SEVERITY_LABELS[s] : 'All'}
          </Link>
        ))}
        {classes && classes.map((c) => (
          <Link
            key={c.id}
            href={buildUrl({ class_id: sp.class_id === c.id ? '' : c.id, page: '1' })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sp.class_id === c.id
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookMarked className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No incidents recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/black-book/${entry.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.learners?.surname}, {entry.learners?.name}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLORS[entry.severity]}`}>
                          {SEVERITY_LABELS[entry.severity]}
                        </span>
                        {entry.principal_notes && (
                          <span title="Principal notes added"><Lock className="w-3 h-3 text-gray-400" /></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {entry.classes?.name} (Gr {entry.classes?.grade}) · {new Date(entry.date).toLocaleDateString('en-ZA')}
                        {isLeadership && entry.profiles && (
                          <> · {entry.profiles.name} {entry.profiles.surname}</>
                        )}
                      </p>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">{entry.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={buildUrl({ page: String(page - 1) })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={buildUrl({ page: String(page + 1) })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  )
}
