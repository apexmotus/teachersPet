'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AttendanceStatus } from '@/lib/types/database'

type Result = { ok: true } | { ok: false; error: string }

interface AttendanceRecord {
  learner_id: string
  status: AttendanceStatus
  notes?: string | null
}

export async function saveAttendance(
  classId: string,
  date: string,
  records: AttendanceRecord[],
): Promise<Result> {
  const today = new Date().toISOString().split('T')[0]
  if (date > today) return { ok: false, error: 'Cannot save attendance for a future date.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return { ok: false, error: 'No school associated with your account.' }

  // Verify class belongs to caller's school
  const { data: cls } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('school_id', profile.school_id)
    .single()
  if (!cls) return { ok: false, error: 'Invalid class.' }

  const rows = records.map((r) => ({
    class_id: classId,
    learner_id: r.learner_id,
    school_id: profile.school_id!,
    date,
    status: r.status,
    notes: r.notes ?? null,
    recorded_by: user.id,
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'class_id,learner_id,date' })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/attendance')
  return { ok: true }
}
