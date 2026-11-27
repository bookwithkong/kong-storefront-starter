'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Field } from '@/components/ui/field'
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
