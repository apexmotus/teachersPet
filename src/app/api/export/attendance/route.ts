import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
  return [
    headers.map(esc).join(','),
    ...rows.map((r) => r.map(esc).join(',')),
  ].join('\r\n')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const classId = sp.get('class_id')
  if (!classId) return NextResponse.json({ error: 'class_id is required' }, { status: 400 })

  const todayStr = new Date().toISOString().split('T')[0]
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const from = sp.get('from') ?? defaultFrom
  const to = sp.get('to') ?? todayStr

  // Validate date range
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()
  if (isNaN(fromMs) || isNaN(toMs)) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  if (toMs - fromMs > 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Date range cannot exceed 90 days' }, { status: 400 })
  }

  // Validate class belongs to school
  const { data: cls } = await supabase
    .from('classes')
    .select('name, grade')
    .eq('id', classId)
    .eq('school_id', profile.school_id)
    .single()
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  type AttExportRow = {
    date: string
    status: string
    notes: string | null
    learners: { surname: string; name: string } | null
  }

  const { data: rawRecords, error } = await supabase
    .from('attendance')
    .select('date, status, notes, learners(surname, name)')
    .eq('class_id', classId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const records = (rawRecords ?? []) as AttExportRow[]

  const headers = ['Date', 'Surname', 'Name', 'Status', 'Notes']
  const rows = records.map((r) => [
    r.date,
    r.learners?.surname ?? '',
    r.learners?.name ?? '',
    r.status,
    r.notes ?? '',
  ])

  const className = `${cls.name}-Gr${cls.grade}`
  const csv = toCsv(headers, rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-${className}-${from}-to-${to}.csv"`,
    },
  })
}
