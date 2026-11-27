import { cookies } from 'next/headers'

/**
 * The guest's session, in an httpOnly cookie.
 *
 * Shared by checkout and the guest area so there is one definition of
 * where the token lives and how it is scoped. Checkout WRITES it the
 * moment an order is created — `createOrder` returns a token, and keeping
 * it here is what lets a guest come back from the payment processor
 * already signed in, with no credential ever travelling in a URL.
 *
 * httpOnly is the point: this token can cancel and reschedule, so a token
 * readable by page scripts is one XSS away from a stranger cancelling
 * somebody's holiday.
 */
const COOKIE = 'kong_guest_token'

const OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  /*
    `lax` rather than `strict` deliberately. The guest returns here from
    the payment processor — a cross-site navigation — and `strict` would
    withhold the cookie on exactly that request, landing them on a sign-in
    form seconds after paying.
  */
  secure: process.env.NODE_ENV === 'production',
  // Not scoped to /manage: checkout sets it, the guest area reads it.
  path: '/',
  maxAge: 60 * 60 * 2,
}

export async function setGuestToken(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, token, OPTIONS)
}

export async function getGuestToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? null
}

export async function clearGuestToken(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}
