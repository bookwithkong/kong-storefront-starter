'use server'

import { revalidatePath } from 'next/cache'
import { kongLive } from '@/lib/kong'
import {
  clearGuestToken,
  getGuestToken,
  setGuestToken,
} from '@/lib/guest-session'

export type SignInState = { error: string | null }

export async function signIn(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const lastName = String(formData.get('lastName') ?? '').trim()
  const reference = String(formData.get('reference') ?? '').trim()

  if (!lastName || !reference) {
    return { error: 'Enter the surname on the booking and your reference.' }
  }

  try {
    /*
      Either reference works. Kong accepts an ORDER reference (ORD-…) or a
      BOOKING reference (BK-…), and a guest reading a confirmation email
      has no idea which one they are looking at — so send whichever they
      typed rather than making them care.
    */
    const isBooking = /^BK-/i.test(reference)
    const { session } = await kongLive.guest.login({
      lastName,
      ...(isBooking
        ? { bookingReference: reference }
        : { orderReference: reference }),
    })

    await setGuestToken(session.token)
    revalidatePath('/manage')
    return { error: null }
  } catch {
    /*
      Deliberately one message for both "no such reference" and "wrong
      surname". Distinguishing them would turn this form into an oracle
      for which booking references exist.
    */
    return { error: 'We could not find that booking. Check the reference and surname.' }
  }
}

export async function signOut(): Promise<void> {
  await clearGuestToken()
  revalidatePath('/manage')
}

export type CancelState = { message: string | null; ok: boolean }

export async function cancelBooking(
  _prev: CancelState,
  formData: FormData
): Promise<CancelState> {
  const token = await getGuestToken()
  if (!token) return { ok: false, message: 'Your session expired. Sign in again.' }

  const reference = String(formData.get('bookingReference') ?? '')
  if (!reference) return { ok: false, message: 'Which booking?' }

  try {
    const result = await kongLive.guest.session(token).cancelBooking(reference)
    revalidatePath('/manage')
    /*
      `success: false` is a REFUSAL, not a failure — the operator does not
      allow self-cancellation, or the booking is inside its cutoff. Kong
      writes that message for the guest, so show it verbatim rather than
      inventing our own.
    */
    return { ok: result.success, message: result.message }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Something went wrong.',
    }
  }
}

