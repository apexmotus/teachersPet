import { createClient } from '@/lib/supabase/server'
import type { NotificationType } from '@/lib/types/database'

export async function createNotification(params: {
  userId: string
  schoolId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      user_id: params.userId,
      school_id: params.schoolId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
    })
  } catch {
    // Notifications are best-effort — never fail the parent action
  }
}
