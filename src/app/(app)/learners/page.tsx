import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LearnersTable } from '@/components/learners/learners-table'
import { LearnersFilters } from '@/components/learners/learners-filters'
import { Paginator } from '@/components/ui/paginator'
import { getPaginationMeta } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { Learner } from '@/lib/types/database'

const PAGE_SIZE = 50

type LearnerRow = Learner & { classes: { name: string; grade: number } | null }

export default async function LearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ class_id?: string; q?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Please complete your profile setup before managing learners.</p>
      </div>
    )
  }

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('learners')
    .select('*, classes(name, grade)', { count: 'exact' })
    .eq('school_id', profile.school_id)
    .order('surname')
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.class_id) query = query.eq('class_id', sp.class_id)
  if (sp.q) query = query.or(`name.ilike.%${sp.q}%,surname.ilike.%${sp.q}%`)

  const [{ data: classes }, { data: rawLearners, count }] = await Promise.all([
    supabase.from('classes').select('id, name, grade').eq('school_id', profile.school_id).order('grade'),
    query,
  ])

  const learners = (rawLearners as LearnerRow[] | null) ?? []
  const learnersWithClass = learners.map((l) => ({
    ...l,
    class_name: l.classes?.name,
    class_grade: l.classes?.grade,
    classes: undefined,
  }))

  const pagination = getPaginationMeta(count ?? 0, page, PAGE_SIZE)

  const baseUrl = (() => {
    const params = new URLSearchParams()
    if (sp.q) params.set('q', sp.q)
    if (sp.class_id) params.set('class_id', sp.class_id)
    return `/learners?${params.toString()}`
  })()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learners</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.totalCount} learner{pagination.totalCount !== 1 ? 's' : ''} across{' '}
            {(classes ?? []).length} class{(classes ?? []).length !== 1 ? 'es' : ''}
          </p>
        </div>
        <a
          href={sp.class_id ? `/api/export/learners?class_id=${sp.class_id}` : '/api/export/learners'}
          download
          className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2'}
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>
      <LearnersFilters
        classes={classes ?? []}
        defaultSearch={sp.q ?? ''}
        defaultClassId={sp.class_id ?? ''}
      />
      <LearnersTable
        learners={learnersWithClass}
        classes={classes ?? []}
        pageOffset={offset}
      />
      <Paginator page={pagination.page} totalPages={pagination.totalPages} baseUrl={baseUrl} />
    </div>
  )
}
