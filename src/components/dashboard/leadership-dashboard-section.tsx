import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { BarChart2, ClipboardList, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface LeadershipDashboardSectionProps {
  attendancePercent: number | null
  totalAttendanceRecords: number
  pendingLessonPlans: number
  classesWithNoRegister: { id: string; name: string; grade: number }[]
  totalClasses: number
}

export function LeadershipDashboardSection({
  attendancePercent,
  totalAttendanceRecords,
  pendingLessonPlans,
  classesWithNoRegister,
  totalClasses,
}: LeadershipDashboardSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Attendance % */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Today&apos;s Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalAttendanceRecords === 0 ? (
            <p className="text-sm text-gray-400">No registers submitted yet.</p>
          ) : (
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {attendancePercent !== null ? `${attendancePercent}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {totalAttendanceRecords} learner records captured
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending lesson plans */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Pending Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-900">{pendingLessonPlans}</p>
          <p className="text-xs text-gray-400 mt-1">lesson plans awaiting approval</p>
          {pendingLessonPlans > 0 && (
            <Link
              href="/lesson-plans?tab=review"
              className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' mt-3'}
            >
              Review plans
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Classes with no register */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Missing Registers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classesWithNoRegister.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">All classes done ✓</p>
          ) : (
            <div className="space-y-1.5">
              {classesWithNoRegister.slice(0, 4).map((cls) => (
                <div key={cls.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-700">{cls.name}</span>
                  <Badge variant="outline" className="text-[10px]">Gr {cls.grade}</Badge>
                </div>
              ))}
              {classesWithNoRegister.length > 4 && (
                <p className="text-xs text-gray-400">
                  +{classesWithNoRegister.length - 4} more classes
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
