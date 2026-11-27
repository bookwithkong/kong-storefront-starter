'use client'

import { useActionState, useState } from 'react'
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
      <div className="border border-accent/40 bg-accent/10 p-8">
        <p className="eyebrow text-accent">Moved</p>
        <h2 className="mt-2 font-display text-2xl">{state.message}</h2>
        <a
          href="/manage"
          className="mt-6 inline-block bg-accent px-6 py-3 text-sm font-medium text-accent-foreground"
        >
          Back to my booking
        </a>
      </div>
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

      <div className="space-y-6">
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
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setChosen(slot)}
                        className={`tabular border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          active
                            ? 'border-accent bg-accent/10'
                            : 'border-line hover:border-accent/60'
                        }`}
                      >
                        {slot.label}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>

      {state.message && !state.ok && (
        <p role="alert" className="mt-6 border border-line bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !chosen}
        className="mt-8 bg-accent px-6 py-3.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {pending
          ? 'Moving…'
          : chosen
            ? `Move to ${chosen.day}, ${chosen.label}`
            : 'Pick a new departure'}
      </button>
    </form>
  )
}
