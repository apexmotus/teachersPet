import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AttendanceSheet } from '@/components/attendance/attendance-sheet'
import { getTeacherClasses } from '@/lib/queries/classes'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class_id?: string }>
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
        <p className="text-gray-500">You are not associated with a school yet. Please complete your profile setup.</p>
      </div>
    )
  }

  const [{ classes, fallback }, sp] = await Promise.all([
    getTeacherClasses(supabase, user.id, profile.school_id, profile.role),
    searchParams,
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Register</h1>
        <p className="text-sm text-gray-500 mt-1">Take attendance for any date</p>
      </div>
      {fallback && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No class assignments found for your account — showing all school classes. Contact your principal to set up class assignments.
        </p>
      )}
      <AttendanceSheet
        classes={classes}
        teacherId={user.id}
        schoolId={profile.school_id}
        defaultClassId={sp.class_id}
      />
    </div>
  )
}
