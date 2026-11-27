'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { kongLive } from '@/lib/kong'

/**
 * The guest's session lives in an httpOnly cookie.
 *
 * Not localStorage. The token can read the booking AND cancel or move it,
 * so it is a credential — and a credential readable by any script on the
 * page is one XSS away from a stranger cancelling somebody's holiday.
 * httpOnly keeps it out of JavaScript entirely; the server reads it and
 * the browser never sees it.
 */
const COOKIE = 'kong_guest_token'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Not `secure` on http://localhost, or the cookie is silently dropped in
  // development and the sign-in appears to do nothing.
  secure: process.env.NODE_ENV === 'production',
  path: '/manage',
  maxAge: 60 * 60 * 2,
}

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

    const jar = await cookies()
    jar.set(COOKIE, session.token, COOKIE_OPTIONS)
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
  const jar = await cookies()
  jar.delete(COOKIE)
  revalidatePath('/manage')
}

export type CancelState = { message: string | null; ok: boolean }

export async function cancelBooking(
  _prev: CancelState,
  formData: FormData
): Promise<CancelState> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
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

/** The token, for the page to read. Server-only — it never reaches the client. */
export async function getGuestToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? null
}
