'use client'

import { useMemo } from 'react'
import {
  CONFIG_FIELDS,
  KONG_API_ORIGIN,
  createStorefrontClient,
  getCalendarDate,
  resolveBookingSelection,
  resolveOptionFirst,
  type BookingOptionLike,
  type BookingOrganizationLike,
  type BookingProductLike,
  type PricingTierLike,
} from '@bookwithkong/storefront'
import { useBooking } from '@bookwithkong/storefront/react'
import { money, type ProductImage } from '@/lib/kong'

/**
 * Your product type — whatever your query selected.
 *
 * `BookingProductLike` is only the handful of fields `useBooking` itself
 * reads. Everything else you ask Kong for is yours, and survives through
 * `resolveBookingSelection` with its own types intact.
 */
/** A tier as YOUR query selected it — the package only requires a subset. */
type StarterTier = PricingTierLike & { name: string }

export interface StarterProduct extends BookingProductLike {
  name: string
  description: string | null
  tagline: string | null
  shortDescription: string | null
  heroImageUrl: string | null
  inclusions: ReadonlyArray<string> | null
  exclusions: ReadonlyArray<string> | null
  itinerary: ReadonlyArray<{
    itemName: string
    description: string | null
    durationMinutes: number | null
    location: string | null
  }> | null
  faqs: ReadonlyArray<{ question: string; answer: string }> | null
  galleryImages: ReadonlyArray<ProductImage> | null
  pricingTiers: ReadonlyArray<StarterTier> | null
  options: ReadonlyArray<
    BookingOptionLike & {
      optionName: string
      pricingTiers: ReadonlyArray<StarterTier> | null
    }
  >
  rentalConfig: unknown
  appointmentConfig: unknown
  accommodationConfig: unknown
  scheduledActivityConfig: unknown
  eventConfig: unknown
  generalAdmissionConfig: unknown
}

/**
 * A browser-side client.
 *
 * NEXT_PUBLIC_ so it is inlined into the bundle. This is the pathway that
 * needs a declared origin in Kong (Website -> Custom site), and in return
 * each guest reaches Kong from their own address — so rate limiting and
 * geography are per guest rather than per server.
 *
 * Keep it at module scope: a client built inside the component would be a
 * new object every render, and `useBooking` wants stable inputs.
 */
const browserKong = createStorefrontClient({
  organizationSlug: process.env.NEXT_PUBLIC_KONG_ORGANIZATION_SLUG ?? 'your-slug',
  origin: process.env.NEXT_PUBLIC_KONG_API_ORIGIN ?? KONG_API_ORIGIN.production,
})

const ORGANIZATION: BookingOrganizationLike = {
  timezone: process.env.NEXT_PUBLIC_KONG_TIMEZONE ?? 'UTC',
  currencyCode: process.env.NEXT_PUBLIC_KONG_CURRENCY ?? null,
}

export function BookingPanel({ product }: { product: StarterProduct }) {
  // No `now` passed: this component only ever renders in the browser, so
  // there is one clock and nothing to disagree with. Pass `now` if you
  // server-render the panel — see the package README.
  const booking = useBooking({
    product,
    organization: ORGANIZATION,
    organizationSlug: browserKong.organizationSlug,
    fetchAvailability: browserKong.availability,
    fetchQuote: browserKong.quote,
    // Your routing, not Kong's. Send the guest wherever your checkout is.
    buildCheckoutUrl: selection =>
      `/checkout?d=${encodeURIComponent(JSON.stringify(selection))}`,
  })

  // Derived from YOUR product, not returned by the hook — that is what
  // keeps `optionName` and the rest of your fields typed.
  const { options, selectedOption, validPricingTiers } = useMemo(
    () => resolveBookingSelection(product, booking.selectedOptionId),
    [product, booking.selectedOptionId]
  )
  const configs = useMemo(
    () => resolveOptionFirst(selectedOption, product, CONFIG_FIELDS),
    [selectedOption, product]
  )

  const slots = booking.availabilityResponse?.availableStartTimes ?? []

  /*
   * Slot times are UTC instants. They must be rendered in the OPERATOR's
   * timezone, not the guest's — a sunset cruise leaves at 17:30 in
   * Langkawi whether the guest is booking from London or Sydney, and
   * `toLocaleString()` with no timezone silently shows them the wrong
   * departure time.
   */
  const slotFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: ORGANIZATION.timezone ?? 'UTC',
      }),
    []
  )

  const timezone = ORGANIZATION.timezone ?? 'UTC'

  /*
   * Dates first, then times for that date.
   *
   * Not cosmetic. `createCheckoutParams` refuses to build without a
   * `selectedDate`, so a panel that only ever calls handleTimeslotSelect
   * leaves the Book button permanently dead — and one of these products
   * has over five thousand bookable slots in ninety days, which no flat
   * list should ever render.
   */
  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: timezone,
      }),
    [timezone]
  )
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
      }),
    [timezone]
  )

  const days = useMemo(() => {
    const byDate = new Map<string, typeof slots>()
    for (const slot of slots) {
      // The calendar date in the OPERATOR's timezone. A 17:30 Langkawi
      // departure is still the 27th for a guest in London, where the UTC
      // instant has already rolled over.
      const date = getCalendarDate(slot.startDateTimeUtc, timezone)
      const list = byDate.get(date)
      if (list) list.push(slot)
      else byDate.set(date, [slot])
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [slots, timezone])

  const timesForDay =
    days.find(([date]) => date === booking.selectedDate)?.[1] ?? []

  const leadPrice = validPricingTiers[0]?.priceCents ?? null
  const guestTotal = Object.values(booking.participantCounts).reduce(
    (sum, n) => sum + (n || 0),
    0
  )

  return (
    <aside className="h-fit border border-line bg-surface">
      <div className="border-b border-line px-6 py-5">
        {leadPrice != null && (
          <p className="flex items-baseline gap-2">
            <span className="text-xs text-muted">from</span>
            <span className="tabular font-display text-3xl leading-none">
              {money(Number(leadPrice))}
            </span>
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Free to hold your place — you pay at checkout.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6">
        {options.length > 1 && (
          <label className="block">
            <span className="eyebrow text-muted">Option</span>
            <select
              className="mt-2 w-full border border-line bg-background px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              value={booking.selectedOptionId}
              onChange={e => booking.setSelectedOptionId(e.target.value)}
            >
              {options.map(o => (
                <option key={o.id} value={o.id}>
                  {o.optionName}
                </option>
              ))}
            </select>
          </label>
        )}

        <div>
          <span className="eyebrow text-muted">Guests</span>
          <div className="mt-3 space-y-3">
            {validPricingTiers.map(tier => {
              const count = booking.participantCounts[tier.pricingTierId] ?? 0
              /*
                A stepper, not a number input. On a phone a bare
                <input type="number"> opens the numeric keyboard over the
                panel just to change a 1 into a 2, and its spinners are
                invisible until hover on a desktop.
              */
              const step = (delta: number) =>
                booking.updateParticipantCount(
                  tier.pricingTierId,
                  Math.max(0, count + delta)
                )
              return (
                <div
                  key={tier.pricingTierId}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{tier.name}</p>
                    {tier.priceCents != null && (
                      <p className="tabular text-xs text-muted">
                        {money(Number(tier.priceCents))} each
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center border border-line">
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={count === 0}
                      aria-label={`One fewer ${tier.name}`}
                      className="px-3 py-1.5 text-sm transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      &minus;
                    </button>
                    <span className="tabular w-8 text-center text-sm font-medium">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={`One more ${tier.name}`}
                      className="px-3 py-1.5 text-sm transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow text-muted">When</span>
            {/*
              Month navigation is the hook's, not ours. Without it a guest
              can only ever see the current month — which on the 28th is
              three days of availability and looks like a sold-out boat.
            */}
            <span className="flex items-center gap-1 text-xs">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  booking.handleMonthChange(
                    new Date(
                      booking.selectedMonth.getFullYear(),
                      booking.selectedMonth.getMonth() - 1,
                      1
                    )
                  )
                }
                className="px-2 py-1 text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                &larr;
              </button>
              <span className="tabular w-20 text-center text-muted">
                {booking.selectedMonth.toLocaleString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  booking.handleMonthChange(
                    new Date(
                      booking.selectedMonth.getFullYear(),
                      booking.selectedMonth.getMonth() + 1,
                      1
                    )
                  )
                }
                className="px-2 py-1 text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                &rarr;
              </button>
            </span>
          </div>

          {booking.isLoadingTimeslots ? (
            <p className="mt-3 text-sm text-muted">Checking availability…</p>
          ) : guestTotal === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Add a guest to see departures.
            </p>
          ) : days.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No departures this month. Try the next one.
            </p>
          ) : (
            <>
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {days.map(([date, daySlots]) => {
                  const active = booking.selectedDate === date
                  return (
                    <li key={date}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => booking.handleDateSelect(date)}
                        className={`w-full border px-2 py-2 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          active
                            ? 'border-accent bg-accent/10 text-foreground'
                            : 'border-line hover:border-accent/60'
                        }`}
                      >
                        <span className="tabular block">
                          {dayFormat.format(new Date(daySlots[0].startDateTimeUtc))}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {booking.selectedDate && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {timesForDay.map(slot => {
                    const active = booking.selectedTimeslot === slot.id
                    return (
                      <li key={slot.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => booking.handleTimeslotSelect(slot)}
                          className={`tabular border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-line hover:border-accent/60'
                          }`}
                        >
                          {timeFormat.format(new Date(slot.startDateTimeUtc))}
                          {slot.orderType === 'WAITLISTED' && (
                            <span className="ml-2 text-xs text-muted">waitlist</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {booking.effectiveAddOns.length > 0 && (
          <div>
            <span className="eyebrow text-muted">Add-ons</span>
            <div className="mt-3 space-y-3">
              {booking.effectiveAddOns.map(addOn => (
                <div
                  key={addOn.addOnId}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate text-sm">{addOn.name}</span>
                  <input
                    type="number"
                    min={0}
                    max={addOn.maxQuantity ?? undefined}
                    className="tabular w-16 border border-line bg-background px-2 py-1.5 text-right text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    value={booking.addOnCounts[addOn.addOnId] ?? 0}
                    onChange={e =>
                      booking.updateAddOnCount(addOn.addOnId, Number(e.target.value))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/*
          Render the rows Kong composed, in order. Do not add them up
          yourself: `addend` marks a step toward the total, `afterTotal` a
          note beneath it. Every price-display bug in this system came from
          a surface recombining these.
        */}
        {booking.priceCalculation && (
          <dl className="space-y-2 border-t border-line pt-5 text-sm">
            {booking.priceCalculation.priceBreakdown.map((row, i) => (
              <div key={i} className="flex justify-between gap-4">
                <dt
                  className={
                    row.kind === 'TOTAL' ? 'font-medium text-foreground' : 'text-muted'
                  }
                >
                  {row.label ?? row.kind}
                </dt>
                <dd
                  className={
                    row.kind === 'TOTAL'
                      ? 'tabular font-medium text-foreground'
                      : 'tabular text-muted'
                  }
                >
                  {money(Number(row.amountCents))}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div>
          <a
            href={booking.checkoutUrl ?? '#'}
            aria-disabled={!booking.checkoutUrl}
            className={`block px-4 py-3.5 text-center text-sm font-medium transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              booking.checkoutUrl
                ? 'bg-accent text-accent-foreground hover:opacity-90'
                : 'pointer-events-none bg-line text-muted'
            }`}
          >
            {booking.bookNowLabel}
          </a>
          {booking.waitlistExplanation && (
            <p className="mt-3 text-xs text-muted">{booking.waitlistExplanation}</p>
          )}
        </div>
      </div>

      <p className="sr-only">{String(configs.scheduledActivityConfig != null)}</p>
    </aside>
  )
}
