'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { LearnerDialog } from './learner-dialog'
import { deleteLearner } from '@/app/actions/learners'
import type { Learner, Class } from '@/lib/types/database'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface LearnerWithClass extends Learner {
  class_name?: string
  class_grade?: number
}

interface Props {
  learners: LearnerWithClass[]
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
}

export function LearnersTable({ learners, classes }: Props) {
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Learner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LearnerWithClass | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filtered = learners.filter((l) => {
    const matchClass = filterClass === 'all' || l.class_id === filterClass
    const q = search.toLowerCase()
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      l.surname.toLowerCase().includes(q)
    return matchClass && matchSearch
  })

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(l: Learner) {
    setEditing(l)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteLearner(deleteTarget.id)
    setDeleting(false)
    if (!result.ok) {
      setDeleteError(result.error)
      return
    }
    setDeleteTarget(null)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={filterClass} onValueChange={(v) => setFilterClass(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} Gr {c.grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="ml-auto gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add learner
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500 mb-3">
            {learners.length === 0 ? 'No learners yet.' : 'No learners match your search.'}
          </p>
          {learners.length === 0 && (
            <Button variant="outline" onClick={openAdd}>Add your first learner</Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Surname</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date of birth</TableHead>
                <TableHead>Parent contact</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{l.surname}</TableCell>
                  <TableCell>{l.name}</TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {l.class_name ?? '—'}
                    {l.class_grade != null && (
                      <span className="text-gray-400 ml-1">Gr {l.class_grade}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {l.date_of_birth
                      ? new Date(l.date_of_birth).toLocaleDateString('en-ZA')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{l.parent_contact ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(l)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(l); setDeleteError(null) }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LearnerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        classes={classes}
        learner={editing}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove learner?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This removes <strong>{deleteTarget?.surname}, {deleteTarget?.name}</strong> and their
            attendance and assessment records permanently.
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
