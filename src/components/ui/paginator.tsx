import Link from 'next/link'

interface PaginatorProps {
  page: number
  totalPages: number
  baseUrl: string
}

export function Paginator({ page, totalPages, baseUrl }: PaginatorProps) {
  if (totalPages <= 1) return null

  const sep = baseUrl.includes('?') ? '&' : '?'
  const prevUrl = `${baseUrl}${sep}page=${page - 1}`
  const nextUrl = `${baseUrl}${sep}page=${page + 1}`

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={prevUrl}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-100 text-gray-300 cursor-not-allowed">
            ← Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={nextUrl}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Next →
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-100 text-gray-300 cursor-not-allowed">
            Next →
          </span>
        )}
      </div>
    </div>
  )
}
