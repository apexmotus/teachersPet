import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Class } from '@/lib/types/database'

export type ClassSummary = Pick<Class, 'id' | 'name' | 'grade'>

/**
 * Returns classes scoped to the teacher:
 * - teacher role: classes they're assigned to via class_teachers; falls back to
 *   all school classes if no assignments exist (common on day one).
 * - leadership (dh/dp/principal): all school classes.
 */
export async function getTeacherClasses(
  supabase: SupabaseClient<Database>,
  userId: string,
  schoolId: string,
  role: string,
): Promise<{ classes: ClassSummary[]; fallback: boolean }> {
  const isLeadership = ['dh', 'dp', 'principal'].includes(role)

  if (isLeadership) {
    const { data } = await supabase
      .from('classes')
      .select('id, name, grade')
      .eq('school_id', schoolId)
      .order('grade')
    return { classes: data ?? [], fallback: false }
  }

  // Teacher: try assigned classes first
  const { data: rawAssigned } = await supabase
    .from('class_teachers')
    .select('class_id, classes(id, name, grade)')
    .eq('teacher_id', userId)

  type AssignedRow = { class_id: string; classes: ClassSummary | null }
  const assigned = rawAssigned as AssignedRow[] | null

  const assignedClasses = (assigned ?? [])
    .flatMap((r) => (r.classes ? [r.classes] : []))
    .sort((a, b) => a.grade - b.grade)

  if (assignedClasses.length > 0) {
    return { classes: assignedClasses, fallback: false }
  }

  // Fallback: no assignments yet — show all school classes with a flag
  const { data: all } = await supabase
    .from('classes')
    .select('id, name, grade')
    .eq('school_id', schoolId)
    .order('grade')

  return { classes: all ?? [], fallback: true }
}
