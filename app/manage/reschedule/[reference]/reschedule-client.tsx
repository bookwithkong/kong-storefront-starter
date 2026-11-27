'use client'

import { useActionState, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Callout } from '@/components/ui/callout'
import { StickyBar } from '@/components/ui/sticky-bar'
import { reschedule, type RescheduleState } from './actions'

export interface SlotChoice {
  id: string
  label: string
  startDateTime: string
  endDateTime: string
  /** `YYYY-MM-DD` in the operator's timezone. */
  date: string
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

  /*
    A calendar, not a list.

    This page offers every bookable departure in the next two months —
    sixty-odd entries. As a list that was four screens of scrolling; as a
    month grid it is two glances.
  */
  const [month, setMonth] = useState(() => {
    const first = slots[0]?.date
    if (!first) return new Date()
    const [y, m] = first.split('-').map(Number)
    return new Date(y, m - 1, 1)
  })
  const [day, setDay] = useState<string | undefined>()

  const availableDates = useMemo(
    () => new Set(slots.map(s => s.date)),
    [slots]
  )
  const timesForDay = slots.filter(s => s.date === day)

  /*
    The early return goes AFTER every hook, never before one. React
    matches hooks by call order, so a `return` above a useState means the
    success render calls fewer hooks than the form render and React
    throws. The linter caught this; it would have crashed the moment a
    reschedule succeeded.
  */
  if (state.ok) {
    return (
      <Callout tone="positive" eyebrow="Moved" title={state.message} role="status">
        <ButtonLink href="/manage" className="mt-4">
          Back to my booking
        </ButtonLink>
      </Callout>
    )
  }

  return (
    <form action={action}>
      <input type="hidden" name="bookingReference" value={bookingReference} />
      <input type="hidden" name="startDateTime" value={chosen?.startDateTime ?? ''} />
      <input type="hidden" name="endDateTime" value={chosen?.endDateTime ?? ''} />

      {/* Room for the sticky bar, so the last row is never behind it. */}
      <div className="max-w-sm pb-28">
        <Calendar
          month={month}
          availableDates={availableDates}
          selected={day}
          onSelect={date => {
            setDay(date)
            // Clear a choice from another day, or the bar would confirm
            // a departure the guest can no longer see.
            setChosen(null)
          }}
          onMonthChange={setMonth}
        />

        {day && timesForDay.length > 0 && (
          <div className="mt-6 border-t border-line pt-6">
            <h3 className="eyebrow text-muted">Departing at</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {timesForDay.map(slot => {
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
        )}
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
