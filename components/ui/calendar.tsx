'use client'

import { cn } from '@/lib/cn'

/**
 * A month grid for picking a date.
 *
 * Replaces a vertical list of date chips. Thirty-one of those is four
 * screens of scrolling to answer "is the 14th free?", and it hides the
 * thing a calendar makes obvious at a glance — which days are available,
 * and where the gaps are.
 *
 * ## Dates are STRINGS here, deliberately
 *
 * `YYYY-MM-DD`, already in the operator's timezone, exactly as Kong
 * returns them. Nothing in this component constructs a `Date` from one,
 * because `new Date('2026-11-27')` is parsed as UTC midnight and then
 * displayed in the viewer's zone — which renders as the 26th for anyone
 * west of Greenwich. A calendar that shows the wrong day is worse than
 * no calendar.
 *
 * The only `Date` used is for the month's own arithmetic, and it is built
 * from UTC parts so it cannot drift either.
 */
export interface CalendarProps {
  /** The month on display. Only its year and month are read. */
  month: Date
  /** Dates that can be picked, as `YYYY-MM-DD`. */
  availableDates: ReadonlySet<string>
  selected?: string
  onSelect: (date: string) => void
  onMonthChange: (month: Date) => void
  /** Disable the back arrow — there is nothing useful in the past. */
  canGoBack?: boolean
  busy?: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * The calendar's silhouette, while availability is being fetched.
 *
 * Six rows because that is the most any month needs, so the panel is the
 * same height before and after the answer arrives. The version this
 * replaced was a single centred line of text, which collapsed the panel
 * by roughly three hundred pixels on every date change and threw the
 * rest of the page upwards — the jump read as the site breaking.
 */
export function CalendarSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <span className="skeleton size-6" />
        <span className="skeleton h-4 w-32" />
        <span className="skeleton size-6" />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={`h-${i}`} className="skeleton mx-auto h-2.5 w-2.5" />
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }, (_, i) => (
          <span key={i} className="skeleton aspect-square w-full opacity-60" />
        ))}
      </div>
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

export function Calendar({
  month,
  availableDates,
  selected,
  onSelect,
  onMonthChange,
  canGoBack = true,
  busy = false,
}: CalendarProps) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()

  // UTC arithmetic so the grid cannot shift by a day near a DST boundary.
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1))
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

  // getUTCDay() is Sunday-first; this grid starts on Monday.
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(firstOfMonth)

  const step = (delta: number) =>
    onMonthChange(new Date(year, monthIndex + delta, 1))

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canGoBack || busy}
          aria-label="Previous month"
          className="px-2 py-1 text-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          &larr;
        </button>
        {/*
          aria-live so a screen-reader user hears the month change. The
          arrows alter content far from themselves, which is otherwise
          silent.
        */}
        <p aria-live="polite" className="text-base font-medium">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={busy}
          aria-label="Next month"
          className="px-2 py-1 text-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          &rarr;
        </button>
      </div>

      <div
        aria-hidden
        className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.75rem] uppercase tracking-wider text-muted"
      >
        {WEEKDAYS.map(d => (
          <span key={d}>{d.charAt(0)}</span>
        ))}
      </div>

      <div className={cn('mt-1 grid grid-cols-7 gap-1', busy && 'opacity-50')}>
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const date = key(year, monthIndex, day)
          const available = availableDates.has(date)
          const isSelected = selected === date

          return (
            <button
              key={date}
              type="button"
              disabled={!available || busy}
              aria-pressed={isSelected}
              aria-label={date}
              onClick={() => onSelect(date)}
              className={cn(
                // The site's easing, over 220ms rather than 150ms: a day
                // that eases into its selected fill reads as a choice
                // being accepted; one that snaps reads as a radio button.
                'tabular aspect-square rounded-control text-[0.9375rem]',
                'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                isSelected
                  ? 'bg-accent font-medium text-accent-foreground shadow-raised'
                  : available
                    ? 'text-foreground hover:bg-accent/15'
                    : // Unavailable days stay VISIBLE but unmistakably
                      // inert. Hiding them would make the month look
                      // like it has holes in it.
                      'cursor-not-allowed text-muted/35'
              )}
            >
              {day}
              {/* A quiet dot under bookable days, so availability reads
                  without relying on text colour alone. */}
              {available && !isSelected && (
                <span
                  aria-hidden
                  className="mx-auto mt-0.5 block size-1 rounded-full bg-accent/70"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
