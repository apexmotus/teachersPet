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

  const classId = req.nextUrl.searchParams.get('class_id')

  // If class_id provided, validate it belongs to this school
  if (classId) {
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('school_id', profile.school_id)
      .single()
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  let query = supabase
    .from('learners')
    .select('surname, name, class_id, classes(name, grade), date_of_birth, parent_contact, id_number')
    .eq('school_id', profile.school_id)
    .order('surname')

  if (classId) query = query.eq('class_id', classId)

  type LearnerExportRow = {
    surname: string | null
    name: string | null
    class_id: string
    classes: { name: string; grade: number } | null
    date_of_birth: string | null
    parent_contact: string | null
    id_number?: string | null
  }

  const { data: rawLearners, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const learners = (rawLearners ?? []) as LearnerExportRow[]

  const headers = ['Surname', 'Name', 'Class', 'Grade', 'ID Number', 'Date of Birth', 'Parent Contact']
  const rows = learners.map((l) => [
    l.surname ?? '',
    l.name ?? '',
    l.classes?.name ?? '',
    l.classes?.grade != null ? String(l.classes.grade) : '',
    l.id_number ?? '',
    l.date_of_birth ?? '',
    l.parent_contact ?? '',
  ])

  const todayStr = new Date().toISOString().split('T')[0]
  const csv = toCsv(headers, rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="learners-${todayStr}.csv"`,
    },
  })
}
