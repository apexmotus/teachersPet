'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { inviteStaffMember } from '@/app/actions/staff'

type Role = 'teacher' | 'dh' | 'dp' | 'principal'

const ROLE_LABELS: Record<Role, string> = {
  teacher: 'Teacher',
  dh: 'Head of Department',
  dp: 'Deputy Principal',
  principal: 'Principal',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function InviteDialog({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('teacher')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleInvite() {
    setSaving(true)
    setError(null)
    const result = await inviteStaffMember({ email, role })
    setSaving(false)
    if (result.ok) {
      setSuccess(true)
      setEmail('')
      setRole('teacher')
    } else {
      setError(result.error)
    }
  }

  function handleClose() {
    setEmail('')
    setRole('teacher')
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite staff member</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-4 text-center">
            <p className="text-sm text-green-600 font-medium">Invitation sent!</p>
            <p className="text-xs text-gray-500 mt-1">
              They will receive an email with instructions to join your school.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email address <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="teacher@school.co.za"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select value={role} onValueChange={(v) => setRole((v ?? 'teacher') as Role)}>
                <SelectTrigger>
                  <span className="flex-1 text-left text-sm">{ROLE_LABELS[role]}</span>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              onClick={handleInvite}
              disabled={saving || !email.trim()}
            >
              {saving ? 'Sending…' : 'Send invitation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
