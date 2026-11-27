'use server'

import { revalidatePath } from 'next/cache'
import { kongLive } from '@/lib/kong'
import { getGuestToken } from '@/lib/guest-session'

export type RescheduleState = { message: string | null; ok: boolean }

export async function reschedule(
  _prev: RescheduleState,
  formData: FormData
): Promise<RescheduleState> {
  const token = await getGuestToken()
  if (!token) return { ok: false, message: 'Your session expired. Sign in again.' }

  const bookingReference = String(formData.get('bookingReference') ?? '')
  const startDateTime = String(formData.get('startDateTime') ?? '')
  const endDateTime = String(formData.get('endDateTime') ?? '')

  if (!bookingReference || !startDateTime || !endDateTime) {
    return { ok: false, message: 'Pick a new departure first.' }
  }

  try {
    const result = await kongLive.guest.session(token).rescheduleBooking({
      bookingReference,
      startDateTime,
      endDateTime,
    })
    revalidatePath('/manage')
    /*
      Same shape as cancelling: `success: false` is the operator's rules
      answering, not a failure. The slot may have filled while the guest
      was choosing, which is exactly the race this round trip exists to
      lose safely.
    */
    return { ok: result.success, message: result.message }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Something went wrong.',
    }
  }
}
