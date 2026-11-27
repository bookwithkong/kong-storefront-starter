'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { StickyBar } from '@/components/ui/sticky-bar'
import { reschedule, type RescheduleState } from './actions'

export interface SlotChoice {
  id: string
  label: string
  startDateTime: string
  endDateTime: string
  day: string
}

export function ReschedulePicker({
  bookingReference,
  slots,
}: {
  bookingReference: string
  slots: SlotChoice[]
}) {
  const [chosen, setChosen] = useState<SlotChoice | null>(null)
  const [state, action, pending] = useActionState<RescheduleState, FormData>(
    reschedule,
    { ok: false, message: null }
  )

  if (state.ok) {
    return (
      <Callout tone="positive" eyebrow="Moved" title={state.message} role="status">
        <ButtonLink href="/manage" className="mt-4">
          Back to my booking
        </ButtonLink>
      </Callout>
    )
  }

  // Group by day so a product running several departures a day reads as
  // days-then-times rather than one long undifferentiated list.
  const days = [...new Set(slots.map(s => s.day))]

  return (
    <form action={action}>
      <input type="hidden" name="bookingReference" value={bookingReference} />
      <input type="hidden" name="startDateTime" value={chosen?.startDateTime ?? ''} />
      <input type="hidden" name="endDateTime" value={chosen?.endDateTime ?? ''} />

      {/* Room for the sticky bar, so the last day is never behind it. */}
      <div className="space-y-6 pb-28">
        {days.map(day => (
          <div key={day}>
            <h3 className="eyebrow text-muted">{day}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {slots
                .filter(s => s.day === day)
                .map(slot => {
                  const active = chosen?.id === slot.id
                  return (
                    <li key={slot.id}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-pressed={active}
                        onClick={() => setChosen(slot)}
                        className={
                          active
                            ? 'tabular border-accent bg-accent/10 text-foreground'
                            : 'tabular'
                        }
                      >
                        {slot.label}
                      </Button>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>

      {state.message && !state.ok && (
        <Callout role="alert" className="mt-6">
          {state.message}
        </Callout>
      )}

      {/*
        The confirm lives in the bar, not at the foot of a forty-item
        list. It also restates the choice, so nobody has to scroll back
        up to check what they picked.
      */}
      <StickyBar show={Boolean(chosen)}>
        <p className="min-w-0 text-sm">
          <span className="block text-xs text-muted">Moving to</span>
          <span className="tabular truncate font-medium">
            {chosen ? `${chosen.day}, ${chosen.label}` : ''}
          </span>
        </p>
        <Button type="submit" size="lg" disabled={pending} className="shrink-0">
          {pending ? 'Moving…' : 'Confirm move'}
        </Button>
      </StickyBar>
    </form>
  )
}
