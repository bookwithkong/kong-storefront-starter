'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Field, TextareaField } from '@/components/ui/field'
import { createBooking, type CheckoutState } from './actions'

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
      <Callout
        tone="positive"
        eyebrow="Confirmed"
        title="You're booked."
        role="status"
        className="p-8"
      >
        <p className="leading-relaxed">
          {state.requiresApproval
            ? 'Your request is with the crew — they will confirm shortly.'
            : 'A confirmation is on its way to your inbox.'}
        </p>
        <dl className="mt-6 space-y-2 border-t border-line/60 pt-5">
          <div className="flex justify-between gap-4">
            <dt>Booking reference</dt>
            <dd className="tabular font-medium text-foreground">
              {state.bookingReference}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Order reference</dt>
            <dd className="tabular font-medium text-foreground">
              {state.orderReference}
            </dd>
          </div>
        </dl>
      </Callout>
    )
  }

  return (
    <form action={action} className="border border-line bg-surface p-8">
      <input type="hidden" name="selection" value={selection} />

      <h2 className="font-display text-2xl">Who's sailing?</h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          defaultValue={typed?.firstName ?? ''}
          required autoComplete="given-name"
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={typed?.lastName ?? ''}
          required autoComplete="family-name"
        />
        <Field
          className="sm:col-span-2"
          label="Email"
          name="email"
          type="email"
          defaultValue={typed?.email ?? ''}
          required
          autoComplete="email"
        />
        <Field
          className="sm:col-span-2"
          label="Phone (optional)"
          name="phone"
          type="tel"
          defaultValue={typed?.phone ?? ''}
          autoComplete="tel"
        />
        <TextareaField
          className="sm:col-span-2"
          label="Anything we should know? (optional)"
          name="specialRequests"
          rows={3}
          defaultValue={typed?.specialRequests ?? ''}
        />
      </div>

      {state.status === 'error' && (
        <Callout role="alert" className="mt-5">
          {state.message}
        </Callout>
      )}

      <Button type="submit" size="lg" block disabled={pending} className="mt-6">
        {pending ? 'Booking…' : 'Confirm booking'}
      </Button>
      <p className="mt-3 text-center text-xs text-muted">
        You will not be charged on this page.
      </p>
    </form>
  )
}
