'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { InviteDialog } from './invite-dialog'
import { resendInvitation, revokeInvitation } from '@/app/actions/staff'
import { UserPlus, Mail, Trash2 } from 'lucide-react'
import type { StaffInvitation } from '@/lib/types/database'

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher',
  dh: 'Dept. Head',
  dp: 'Deputy Principal',
  principal: 'Principal',
}

const ROLE_COLORS: Record<string, string> = {
  teacher: 'bg-gray-100 text-gray-700',
  dh: 'bg-blue-100 text-blue-700',
  dp: 'bg-purple-100 text-purple-700',
  principal: 'bg-orange-100 text-orange-700',
}

interface StaffMember {
  id: string
  name: string | null
  surname: string | null
  role: string
  created_at: string
}

type InviteRow = StaffInvitation & {
  profiles: { name: string; surname: string } | null
}

interface Props {
  staffMembers: StaffMember[]
  pendingInvites: InviteRow[]
}

export function StaffManager({ staffMembers, pendingInvites }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleResend(id: string) {
    setBusyId(id)
    await resendInvitation(id)
    setBusyId(null)
  }

  async function handleRevoke(id: string) {
    setBusyId(id)
    await revokeInvitation(id)
    setBusyId(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Current staff</h2>
          <p className="text-sm text-gray-500">{staffMembers.length} member{staffMembers.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Invite staff
        </Button>
      </div>

      <Card>
        <CardContent className="py-0">
          {staffMembers.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No staff members yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {staffMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.surname}, {m.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(m.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900">Pending invitations</h2>
          <Card>
            <CardContent className="py-0">
              <div className="divide-y divide-gray-50">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400">
                        {inv.accepted_at
                          ? `Accepted ${new Date(inv.accepted_at).toLocaleDateString('en-ZA')}`
                          : `Invited by ${inv.profiles?.surname ?? ''}, ${inv.profiles?.name ?? ''} · ${new Date(inv.created_at).toLocaleDateString('en-ZA')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[inv.role] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                      {inv.accepted_at ? (
                        <Badge variant="secondary" className="text-green-600 text-xs">Accepted</Badge>
                      ) : (
                        <>
                          <button
                            onClick={() => handleResend(inv.id)}
                            disabled={busyId === inv.id}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Resend invitation"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            disabled={busyId === inv.id}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Revoke invitation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
