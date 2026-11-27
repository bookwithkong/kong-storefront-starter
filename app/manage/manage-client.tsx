'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Field } from '@/components/ui/field'
import {
  forgetBookings,
  readRecentBookings,
  rememberBooking,
  type RecentBooking,
} from '@/lib/recent-bookings'
import {
  cancelBooking,
  signIn,
  type CancelState,
  type SignInState,
} from './actions'

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    { error: null }
  )

  /*
    Read AFTER mount, never during render.

    localStorage does not exist on the server, so reading it while
    rendering would make the server's HTML and the browser's first render
    disagree — a hydration mismatch. Starting empty and filling in on
    mount is the only version that is correct in both places.
  */
  const [recent, setRecent] = useState<RecentBooking[]>([])
  const [reference, setReference] = useState('')
  useEffect(() => {
    /*
      Deferred by a task, not set synchronously — the same pattern as
      components/ui/reveal.tsx, and for the same reason: a setState
      during the effect re-renders before the browser has painted, which
      React flags as a cascading render.
    */
    const timer = setTimeout(() => setRecent(readRecentBookings()), 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <form action={action} className="border border-line bg-surface p-8">
      <h2 className="font-display text-2xl">Find your booking</h2>
      <p className="mt-2 text-sm text-muted">
        The reference is on your confirmation email — it starts with ORD- or BK-.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Surname" name="lastName" required autoComplete="family-name" />
        <Field
          label="Reference"
          name="reference"
          required
          placeholder="ORD-ABC123"
          autoCapitalize="characters"
          value={reference}
          onChange={e => setReference(e.target.value)}
        />
      </div>

      {state.error && (
        <Callout role="alert" className="mt-5">
          {state.error}
        </Callout>
      )}

      <Button type="submit" size="lg" block disabled={pending} className="mt-6">
        {pending ? 'Looking…' : 'Find booking'}
      </Button>

      {recent.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="eyebrow text-muted">Booked on this device</h3>
            <button
              type="button"
              onClick={() => {
                forgetBookings()
                setRecent([])
              }}
              className="text-xs text-muted underline-offset-4 hover:text-accent hover:underline"
            >
              Forget these
            </button>
          </div>

          {/*
            These fill in the REFERENCE only. The surname is still typed,
            which is what keeps this a convenience rather than a stored
            login — the two halves together would be a credential pair
            sitting on a possibly shared computer.
          */}
          <ul className="mt-3 flex flex-wrap gap-2">
            {recent.map(booking => (
              <li key={booking.reference}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReference(booking.reference)}
                  className={
                    reference === booking.reference
                      ? 'border-accent bg-accent/10'
                      : ''
                  }
                >
                  <span className="truncate">{booking.label}</span>
                  <span className="tabular text-xs text-muted">
                    {booking.reference}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Stored in this browser only. We keep the reference, never your
            name or a way in.
          </p>
        </div>
      )}
    </form>
  )
}

/**
 * Records a reference once the guest is looking at the booking.
 *
 * Rendered by the signed-in page rather than written inside the sign-in
 * action, because a Server Action cannot reach localStorage — and
 * because this way a guest who arrives back from a payment, with no
 * sign-in at all, is remembered too.
 */
export function RememberBooking({
  reference,
  label,
}: {
  reference: string
  label: string
}) {
  useEffect(() => {
    rememberBooking({ reference, label })
  }, [reference, label])
  return null
}

export function CancelButton({
  bookingReference,
  canCancel,
}: {
  bookingReference: string
  canCancel: boolean
}) {
  const [state, action, pending] = useActionState<CancelState, FormData>(
    cancelBooking,
    { ok: false, message: null }
  )

  return (
    <form action={action}>
      <input type="hidden" name="bookingReference" value={bookingReference} />
      {/*
        The button is disabled from the BOOKING, not from a guess. canCancel
        is false when the operator does not allow self-cancellation, and
        when the booking is cancelled, completed, or inside its cutoff —
        so the control disappears for the same reasons the server would
        refuse, instead of inviting a click that fails.
      */}
      <Button type="submit" variant="secondary" disabled={pending || !canCancel}>
        {pending ? 'Cancelling…' : 'Cancel booking'}
      </Button>
      {state.message && (
        <p
          role="status"
          className={`mt-3 text-sm ${state.ok ? 'text-muted' : 'text-foreground'}`}
        >
          {state.message}
        </p>
      )}
    </form>
  )
}
