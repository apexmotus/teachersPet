import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClassesManager } from '@/components/classes/classes-manager'

export default async function ClassesPage() {
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
        <p className="text-gray-500">Please complete your profile setup first.</p>
      </div>
    )
  }

  const isLeadership = ['dh', 'dp', 'principal'].includes(profile.role)
  if (!isLeadership) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Class management is restricted to school leadership.</p>
      </div>
    )
  }

  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', profile.school_id)
    .order('grade')
    .order('name')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-sm text-gray-500 mt-1">
          {(classes ?? []).length} class{(classes ?? []).length !== 1 ? 'es' : ''} — manage your school&apos;s classes here
        </p>
      </div>
      <ClassesManager classes={classes ?? []} />
    </div>
  )
}
