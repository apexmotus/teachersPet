import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StaffManager } from '@/components/staff/staff-manager'
import type { StaffInvitation } from '@/lib/types/database'

type InviteRow = StaffInvitation & {
  profiles: { name: string; surname: string } | null
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) redirect('/login')
  if (!['dh', 'dp', 'principal'].includes(profile.role)) redirect('/dashboard')

  const schoolId = profile.school_id

  const [{ data: staffMembers }, { data: rawInvites }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, surname, role, created_at')
      .eq('school_id', schoolId)
      .order('surname'),
    supabase
      .from('staff_invitations')
      .select('*, profiles!invited_by(name, surname)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false }),
  ])

  const pendingInvites = (rawInvites ?? []) as InviteRow[]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your school staff and invite new members</p>
      </div>
      <StaffManager staffMembers={staffMembers ?? []} pendingInvites={pendingInvites} />
    </div>
  )
}
