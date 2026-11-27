'use client'

import { useActionState } from 'react'
import {
  cancelBooking,
  signIn,
  type CancelState,
  type SignInState,
} from './actions'

const FIELD =
  'mt-2 w-full border border-line bg-background px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    { error: null }
  )

  return (
    <form action={action} className="border border-line bg-surface p-8">
      <h2 className="font-display text-2xl">Find your booking</h2>
      <p className="mt-2 text-sm text-muted">
        The reference is on your confirmation email — it starts with ORD- or BK-.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-muted">Surname</span>
          <input name="lastName" required autoComplete="family-name" className={FIELD} />
        </label>
        <label className="block">
          <span className="eyebrow text-muted">Reference</span>
          <input
            name="reference"
            required
            placeholder="ORD-ABC123"
            autoCapitalize="characters"
            className={FIELD}
          />
        </label>
      </div>

      {state.error && (
        <p role="alert" className="mt-5 border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full bg-accent px-4 py-3.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {pending ? 'Looking…' : 'Find booking'}
      </button>
    </form>
  )
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
      <button
        type="submit"
        disabled={pending || !canCancel}
        className="border border-line px-4 py-2 text-sm transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {pending ? 'Cancelling…' : 'Cancel booking'}
      </button>
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
