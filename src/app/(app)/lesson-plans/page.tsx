import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Paginator } from '@/components/ui/paginator'
import { getPaginationMeta } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { LessonPlan, LessonPlanStatus } from '@/lib/types/database'

const PAGE_SIZE = 20

type PlanRow = LessonPlan & {
  classes: { name: string; grade: number } | null
  subjects: { name: string } | null
  profiles?: { name: string; surname: string } | null
}

const STATUS_STYLE: Record<LessonPlanStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
}

export default async function LessonPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
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
        <p className="text-gray-500">Please complete your profile setup.</p>
      </div>
    )
  }

  const isLeadership = ['dh', 'dp', 'principal'].includes(profile.role)
  const params = await searchParams
  const tab = params.tab === 'review' && isLeadership ? 'review' : 'mine'
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [{ data: rawMy, count: myCount }, { data: rawReview, count: reviewCount }] = await Promise.all([
    supabase
      .from('lesson_plans')
      .select('*, classes(name, grade), subjects(name)', { count: 'exact' })
      .eq('teacher_id', user.id)
      .order('date', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    isLeadership
      ? supabase
          .from('lesson_plans')
          .select('*, classes(name, grade), subjects(name), profiles(name, surname)', { count: 'exact' })
          .eq('school_id', profile.school_id)
          .eq('status', 'submitted')
          .order('date', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)
      : Promise.resolve({ data: [] as unknown[], count: 0 }),
  ])

  const myPlans = rawMy as PlanRow[] | null
  const reviewPlans = rawReview as PlanRow[] | null

  const displayPlans = tab === 'review' ? (reviewPlans ?? []) : (myPlans ?? [])
  const totalCount = tab === 'review' ? (reviewCount ?? 0) : (myCount ?? 0)
  const pagination = getPaginationMeta(totalCount, page, PAGE_SIZE)

  const reviewTotalCount = reviewCount ?? 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lesson Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Create, submit, and track your lesson plans</p>
        </div>
        <Link href="/lesson-plans/new" className={buttonVariants({ variant: 'default' }) + ' gap-2'}>
          <Plus className="w-4 h-4" /> New plan
        </Link>
      </div>

      {isLeadership && (
        <div className="flex gap-2">
          <Link
            href="/lesson-plans"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'mine'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            My plans
          </Link>
          <Link
            href="/lesson-plans?tab=review"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'review'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Submitted for review
            {reviewTotalCount > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {reviewTotalCount}
              </span>
            )}
          </Link>
        </div>
      )}

      {displayPlans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500 mb-3">
            {tab === 'review'
              ? 'No plans awaiting review.'
              : 'No lesson plans yet.'}
          </p>
          {tab === 'mine' && (
            <Link
              href="/lesson-plans/new"
              className={buttonVariants({ variant: 'outline' })}
            >
              Create your first plan
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {displayPlans.map((p) => (
            <Link
              key={p.id}
              href={`/lesson-plans/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.topic}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.classes ? `${p.classes.name} Gr ${p.classes.grade}` : '—'}
                  {p.subjects ? ` · ${p.subjects.name}` : ''}
                  {p.profiles ? ` · ${p.profiles.surname}, ${p.profiles.name}` : ''}
                  {' · '}
                  {new Date(p.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              <span className={`shrink-0 ml-4 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[p.status as LessonPlanStatus]}`}>
                {p.status}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Paginator
        page={pagination.page}
        totalPages={pagination.totalPages}
        baseUrl={tab === 'review' ? '/lesson-plans?tab=review' : '/lesson-plans'}
      />
    </div>
  )
}
