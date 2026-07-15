'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type Role = 'teacher' | 'dh' | 'dp' | 'principal'
type Result = { ok: true } | { ok: false; error: string }

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function getLeadershipContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) return null
  if (!['dh', 'dp', 'principal'].includes(profile.role)) return null
  const schoolId: string = profile.school_id
  return { supabase, user, profile: { ...profile, school_id: schoolId } }
}

export async function inviteStaffMember(payload: { email: string; role: Role }): Promise<Result> {
  const ctx = await getLeadershipContext()
  if (!ctx) return { ok: false, error: 'Unauthorized' }

  if (!isValidEmail(payload.email)) return { ok: false, error: 'Invalid email address' }
  if (!['teacher', 'dh', 'dp', 'principal'].includes(payload.role)) {
    return { ok: false, error: 'Invalid role' }
  }

  // Insert invitation row first
  const { error: insertError } = await ctx.supabase
    .from('staff_invitations')
    .insert({
      school_id: ctx.profile.school_id,
      email: payload.email,
      role: payload.role,
      invited_by: ctx.user.id,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return { ok: false, error: 'This email has already been invited to your school.' }
    }
    return { ok: false, error: insertError.message }
  }

  // Send invite email via admin client
  const admin = createAdminClient()
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(payload.email, {
    data: {
      school_id: ctx.profile.school_id,
      role: payload.role,
    },
  })

  if (inviteError) {
    // Roll back invitation row if email fails
    await ctx.supabase
      .from('staff_invitations')
      .delete()
      .eq('school_id', ctx.profile.school_id)
      .eq('email', payload.email)
    return { ok: false, error: inviteError.message }
  }

  revalidatePath('/staff')
  return { ok: true }
}

export async function resendInvitation(id: string): Promise<Result> {
  const ctx = await getLeadershipContext()
  if (!ctx) return { ok: false, error: 'Unauthorized' }

  const { data: inv } = await ctx.supabase
    .from('staff_invitations')
    .select('email, role, school_id')
    .eq('id', id)
    .eq('school_id', ctx.profile.school_id)
    .single()

  if (!inv) return { ok: false, error: 'Invitation not found' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(inv.email, {
    data: { school_id: inv.school_id, role: inv.role },
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/staff')
  return { ok: true }
}

export async function revokeInvitation(id: string): Promise<Result> {
  const ctx = await getLeadershipContext()
  if (!ctx) return { ok: false, error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('staff_invitations')
    .delete()
    .eq('id', id)
    .eq('school_id', ctx.profile.school_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/staff')
  return { ok: true }
}
