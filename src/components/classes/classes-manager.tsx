'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ClassDialog } from './class-dialog'
import { deleteClass } from '@/app/actions/classes'
import type { Class } from '@/lib/types/database'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface Props {
  classes: Class[]
}

export function ClassesManager({ classes }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Class | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openAdd() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: Class) { setEditing(c); setDialogOpen(true) }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteClass(deleteTarget.id)
    setDeleting(false)
    if (!result.ok) { setDeleteError(result.error); return }
    setDeleteTarget(null)
  }

  // Group by grade for display
  const byGrade = classes.reduce<Record<number, Class[]>>((acc, c) => {
    ;(acc[c.grade] ??= []).push(c)
    return acc
  }, {})
  const grades = Object.keys(byGrade).map(Number).sort((a, b) => a - b)

  return (
    <>
      <div className="flex justify-end">
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add class
        </Button>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500 mb-3">No classes yet.</p>
          <Button variant="outline" onClick={openAdd}>Add your first class</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grades.map((grade) => (
            <div key={grade}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Grade {grade}
              </h2>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {byGrade[grade].map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 bg-white">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.year}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(c); setDeleteError(null) }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ClassDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        cls={editing}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete class?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Deleting <strong>{deleteTarget?.name}</strong> will also remove all learners, attendance records, and lesson plans linked to it.
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
