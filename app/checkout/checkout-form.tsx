'use client'

import { useActionState } from 'react'
import { createBooking, type CheckoutState } from './actions'

const FIELD =
  'mt-2 w-full border border-line bg-background px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function CheckoutForm({ selection }: { selection: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    createBooking,
    { status: 'idle' }
  )

  /*
   * Keep what the guest typed when the server rejects the booking.
   *
   * These are uncontrolled inputs inside a form that re-renders on the
   * action's result, so without defaultValue every field empties on an
   * error — the guest re-types their name and email to read the message
   * again. `values` comes back on the error state for exactly this.
   */
  const typed = state.status === 'error' ? state.values : undefined

  if (state.status === 'booked') {
    return (
      <div className="border border-line bg-surface p-8">
        <p className="eyebrow text-accent">Confirmed</p>
        <h2 className="mt-3 font-display text-3xl">You're booked.</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {state.requiresApproval
            ? 'Your request is with the crew — they will confirm shortly.'
            : 'A confirmation is on its way to your inbox.'}
        </p>
        <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Booking reference</dt>
            <dd className="tabular font-medium">{state.bookingReference}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Order reference</dt>
            <dd className="tabular font-medium">{state.orderReference}</dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <form action={action} className="border border-line bg-surface p-8">
      <input type="hidden" name="selection" value={selection} />

      <h2 className="font-display text-2xl">Who's sailing?</h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-muted">First name</span>
          <input name="firstName" defaultValue={typed?.firstName ?? ''} required autoComplete="given-name" className={FIELD} />
        </label>
        <label className="block">
          <span className="eyebrow text-muted">Last name</span>
          <input name="lastName" defaultValue={typed?.lastName ?? ''} required autoComplete="family-name" className={FIELD} />
        </label>
        <label className="block sm:col-span-2">
          <span className="eyebrow text-muted">Email</span>
          <input name="email" defaultValue={typed?.email ?? ''} type="email" required autoComplete="email" className={FIELD} />
        </label>
        <label className="block sm:col-span-2">
          <span className="eyebrow text-muted">Phone (optional)</span>
          <input name="phone" defaultValue={typed?.phone ?? ''} type="tel" autoComplete="tel" className={FIELD} />
        </label>
        <label className="block sm:col-span-2">
          <span className="eyebrow text-muted">Anything we should know? (optional)</span>
          <textarea name="specialRequests" rows={3} defaultValue={typed?.specialRequests ?? ''} className={FIELD} />
        </label>
      </div>

      {state.status === 'error' && (
        <p
          role="alert"
          className="mt-5 border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full bg-accent px-4 py-3.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {pending ? 'Booking…' : 'Confirm booking'}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        You will not be charged on this page.
      </p>
    </form>
  )
}
