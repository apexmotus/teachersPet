'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import type { Class } from '@/lib/types/database'

interface Props {
  classes: Pick<Class, 'id' | 'name' | 'grade'>[]
  defaultSearch: string
  defaultClassId: string
}

export function LearnersFilters({ classes, defaultSearch, defaultClassId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const push = useCallback((q: string, classId: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (classId) params.set('class_id', classId)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname])

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = e.target.value
    debounceRef.current = setTimeout(() => push(q, defaultClassId), 300)
  }

  function onClassChange(classId: string | null) {
    push(defaultSearch, (classId ?? '') === 'all' ? '' : (classId ?? ''))
  }

  const selectedClass = classes.find((c) => c.id === defaultClassId)

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search by name…"
        defaultValue={defaultSearch}
        onChange={onSearch}
        className="w-56"
      />
      <Select value={defaultClassId || 'all'} onValueChange={onClassChange}>
        <SelectTrigger className="w-44">
          <span className="flex-1 text-left text-sm truncate">
            {selectedClass ? `${selectedClass.name} Gr ${selectedClass.grade}` : 'All classes'}
          </span>
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
    </div>
  )
}
