import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPaginationMeta(count: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  return {
    page,
    pageSize,
    totalPages,
    totalCount: count,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  }
}
