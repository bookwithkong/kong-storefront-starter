/**
 * Booking references this browser has seen, for a faster return visit.
 *
 * ## What is stored, and what deliberately is not
 *
 * The REFERENCE and a label. Never the guest token, and never the
 * surname.
 *
 * The token is a credential — it can cancel and reschedule — so it lives
 * in an httpOnly cookie that scripts cannot read (`lib/guest-session.ts`).
 * Putting it here would hand every past booking to any script that ever
 * runs on this origin.
 *
 * A reference alone opens nothing: `guest.login` wants a surname with it.
 * So this is a convenience that saves someone hunting for a confirmation
 * email, not a stored login. Keeping the surname out is what keeps it
 * that way — the two halves together WOULD be a credential pair, sitting
 * in plain text on a possibly shared computer.
 *
 * ## Why it is not a cookie
 *
 * This never needs to reach the server. A cookie would be sent on every
 * request, for no reason, and would have to be read during SSR — where
 * it would disagree with what the browser renders.
 */
const KEY = 'kong.recentBookings'
const LIMIT = 10

export interface RecentBooking {
  reference: string
  /** What the guest will recognise, e.g. "Langkawi Sunset Yacht Cruise". */
  label: string
  /** ISO timestamp, so the list can be ordered and aged out. */
  savedAt: string
}

/** Browser-only. Returns [] on the server, where there is no storage. */
export function readRecentBookings(): RecentBooking[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    /*
      Validated rather than trusted. localStorage is editable by anyone
      at this keyboard and survives across deploys, so a shape written by
      an older version of this site — or by hand — must not crash the
      page it is read on.
    */
    return parsed
      .filter(
        (b): b is RecentBooking =>
          typeof b?.reference === 'string' &&
          typeof b?.label === 'string' &&
          typeof b?.savedAt === 'string'
      )
      .slice(0, LIMIT)
  } catch {
    // Private browsing in some engines throws on access rather than
    // returning null. A missing convenience must never break the page.
    return []
  }
}

export function rememberBooking(entry: Omit<RecentBooking, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const existing = readRecentBookings().filter(
      b => b.reference !== entry.reference
    )
    const next = [
      { ...entry, savedAt: new Date().toISOString() },
      ...existing,
    ].slice(0, LIMIT)
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full, or disabled. Nothing here is worth failing a booking.
  }
}

export function forgetBookings(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* as above */
  }
}
