'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KONG_API_ORIGIN,
  createStorefrontClient,
  getCalendarDate,
  getCurrentYearMonthInTimezone,
  isViewingCurrentMonth,
  resolveBookingSelection,
  type BookingOptionLike,
  type BookingOrganizationLike,
  type BookingProductLike,
  type PricingTierLike,
} from '@bookwithkong/storefront'
import { useBooking } from '@bookwithkong/storefront/react'
import { money, type ProductImage } from '@/lib/kong'
import { cn } from '@/lib/cn'
import { Button, buttonClass } from '@/components/ui/button'
import { Calendar, CalendarSkeleton } from '@/components/ui/calendar'
import { Price } from '@/components/ui/price'
import { StickyBar } from '@/components/ui/sticky-bar'

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
  const { options, validPricingTiers } = useMemo(
    () => resolveBookingSelection(product, booking.selectedOptionId),
    [product, booking.selectedOptionId]
  )

  /*
    Memoised because `days` below depends on it. `x ?? []` builds a NEW
    array every render, so without this the memo never hits and the whole
    slot list is regrouped on every keystroke elsewhere in the panel.
  */
  const slots = useMemo(
    () => booking.availabilityResponse?.availableStartTimes ?? [],
    [booking.availabilityResponse]
  )

  /*
   * Slot times are UTC instants. They must be rendered in the OPERATOR's
   * timezone, not the guest's — a sunset cruise leaves at 17:30 in
   * Langkawi whether the guest is booking from London or Sydney, and
   * `toLocaleString()` with no timezone silently shows them the wrong
   * departure time.
   */
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

  const availableDates = useMemo(
    () => new Set(days.map(([date]) => date)),
    [days]
  )

  const timesForDay =
    days.find(([date]) => date === booking.selectedDate)?.[1] ?? []

  const leadPrice = validPricingTiers[0]?.priceCents ?? null
  const guestTotal = Object.values(booking.participantCounts).reduce(
    (sum, n) => sum + (n || 0),
    0
  )

  /*
   * A day, spoken rather than printed.
   *
   * Built from the STRING's own parts into a UTC instant and formatted in
   * UTC — never `new Date('2026-11-28')` reinterpreted locally, which is
   * the bug this whole file is careful about. The round trip is exact
   * because both ends agree the zone is UTC; the date never moves.
   */
  const spokenDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, d)))
  }

  /*
   * What a screen reader hears when availability changes.
   *
   * The calendar repaints silently: a sighted guest sees dots appear, and
   * everyone else gets nothing at all. This replaces an `sr-only` node
   * that was left behind from debugging and announced the literal word
   * "true" at the end of the panel.
   */
  const announcement = booking.isLoadingTimeslots
    ? 'Checking availability'
    : guestTotal === 0
      ? ''
      : booking.selectedDate && timesForDay.length > 0
        ? `${timesForDay.length} departure${timesForDay.length === 1 ? '' : 's'} on ${spokenDate(booking.selectedDate)}.`
        : availableDates.size === 0
          ? 'No departures this month.'
          : `${availableDates.size} day${availableDates.size === 1 ? '' : 's'} available this month.`

  /*
   * The mobile action bar.
   *
   * On a phone the panel sits below the itinerary, the gallery and the
   * FAQs — four screens before a guest meets a price. Rather than pinning
   * the whole panel and eating the viewport they are reading with, a thin
   * bar carries the price and a jump link once the panel scrolls away.
   *
   * Observed rather than measured from a scroll handler: one observer
   * costs nothing and does not run on every frame.
   */
  const panelRef = useRef<HTMLElement>(null)
  const [panelOffScreen, setPanelOffScreen] = useState(false)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const node = panelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) setPanelOffScreen(!entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /*
   * Two conditions, not one.
   *
   * The panel is off-screen at the top of the page as well as at the
   * bottom, so observing it alone would park the bar over the hero
   * before the guest has scrolled a pixel — which is the opposite of
   * "appears when you need it". The second signal is simply whether we
   * have left the first screen.
   *
   * React bails out of a re-render when a `useState` setter is handed the
   * value it already holds, so firing this on every scroll frame costs a
   * comparison and nothing else.
   */
  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <aside
      ref={panelRef}
      id="book"
      className="surface-panel h-fit scroll-mt-8 rounded-panel border border-line"
    >
      <div className="border-b border-line px-7 py-6">
        <Price cents={leadPrice == null ? null : Number(leadPrice)} size="lg" />
        <p className="mt-3 text-[0.8125rem] text-muted">
          Free to hold your place — you pay at checkout.
        </p>
      </div>

      {/*
        The three decisions — who, when, how much — with real air between
        them. They were `space-y-6` apart, which made the panel read as
        one dense form rather than three short questions.
      */}
      <div className="space-y-8 px-7 py-7">
        {options.length > 1 && (
          <label className="block">
            <span className="eyebrow text-muted">Option</span>
            {/*
              `appearance-none` with our own chevron, rather than a custom
              listbox. A native <select> keeps the platform's keyboard
              handling, its typeahead, and the full-height wheel a phone
              shows instead of a cramped dropdown — none of which a div
              gets back without a lot of code and some of which it never
              does. Only the closed state was ever off-brand, and that is
              the part that can be styled.
            */}
            <div className="relative mt-2.5">
              <select
                className="w-full appearance-none rounded-control border border-line bg-background py-3 pl-4 pr-10 text-base transition-[border-color,box-shadow] duration-200 hover:border-muted/40 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_18%,transparent)] focus:outline-none"
                value={booking.selectedOptionId}
                onChange={e => booking.setSelectedOptionId(e.target.value)}
              >
                {options.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.optionName}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted"
              >
                <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
                  <path
                    d="M1 1l4.5 4.5L10 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
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
                    <p className="truncate text-base">{tier.name}</p>
                    {tier.priceCents != null && (
                      <p className="tabular text-[0.8125rem] text-muted">
                        {money(Number(tier.priceCents))} each
                      </p>
                    )}
                  </div>
                  {/*
                    A pill, and big enough to hit. The square-cornered
                    version was 1.5rem tall with 12px glyphs — under the
                    44px touch target everyone agrees on, and the one
                    control a guest uses before anything else.
                  */}
                  <div className="flex shrink-0 items-center rounded-pill border border-line bg-background shadow-raised">
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={count === 0}
                      aria-label={`One fewer ${tier.name}`}
                      className="rounded-l-pill px-4 py-2.5 text-base text-muted transition-colors duration-200 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                    >
                      &minus;
                    </button>
                    <span className="tabular w-9 text-center text-base font-medium">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={`One more ${tier.name}`}
                      className="rounded-r-pill px-4 py-2.5 text-base text-muted transition-colors duration-200 hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
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
          <span className="eyebrow text-muted">When</span>

          <div className="mt-3">
            {booking.isLoadingTimeslots ? (
              /*
                A calendar-shaped placeholder, not a line of text. The
                text version was two lines tall where the grid is twelve,
                so every fetch collapsed the panel and threw the page
                below it upwards — the single most expensive-feeling bug
                on the page, because it happened on every date change.
              */
              <CalendarSkeleton />
            ) : guestTotal === 0 ? (
              <p className="py-8 text-center text-[0.9375rem] text-muted">
                Add a guest to see departures.
              </p>
            ) : (
              <>
                {/*
                  A month grid, not a list of dates. Thirty-one chips is
                  four screens of scrolling to answer "is the 14th free",
                  and it hides what a calendar shows instantly — where
                  the gaps are.

                  Month navigation belongs to the hook: without it a
                  guest only ever sees the current month, which on the
                  28th is three days of availability and looks like a
                  sold-out boat.
                */}
                <Calendar
                  month={booking.selectedMonth}
                  availableDates={availableDates}
                  selected={booking.selectedDate}
                  onSelect={booking.handleDateSelect}
                  onMonthChange={booking.handleMonthChange}
                  canGoBack={
                    !isViewingCurrentMonth(
                      {
                        year: booking.selectedMonth.getFullYear(),
                        month: booking.selectedMonth.getMonth(),
                      },
                      // The OPERATOR's current month, not the viewer's.
                      // A guest in Sydney on the 1st must not be able to
                      // page back into a month that is already over in
                      // Langkawi.
                      getCurrentYearMonthInTimezone(timezone)
                    )
                  }
                  busy={booking.isLoadingTimeslots}
                />

                {availableDates.size === 0 && (
                  <p className="mt-4 text-center text-[0.9375rem] text-muted">
                    No departures this month. Try the next one.
                  </p>
                )}

                {booking.selectedDate && timesForDay.length > 0 && (
                  // Faded in rather than popped in. The times are a
                  // consequence of the tap that just happened, and
                  // arriving instantly reads as a layout jump.
                  <div className="fade-in mt-6 border-t border-line pt-6">
                    <span className="eyebrow text-muted">Departing at</span>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {timesForDay.map(slot => {
                        const active = booking.selectedTimeslot === slot.id
                        return (
                          <li key={slot.id}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              aria-pressed={active}
                              onClick={() => booking.handleTimeslotSelect(slot)}
                              className={
                                active
                                  ? 'tabular border-accent bg-accent/10 text-foreground'
                                  : 'tabular'
                              }
                            >
                              {timeFormat.format(new Date(slot.startDateTimeUtc))}
                              {slot.orderType === 'WAITLISTED' && (
                                <span className="ml-1 text-xs text-muted">
                                  waitlist
                                </span>
                              )}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
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
          <dl className="fade-in space-y-2.5 border-t border-line pt-6 text-[0.9375rem]">
            {booking.priceCalculation.priceBreakdown.map((row, i) => {
              /*
                The TOTAL is the sentence the whole panel has been
                building towards, and it was set in the same 14px as the
                rows above it. A rule and the display face separate the
                answer from the arithmetic — WITHOUT recombining any of
                it: the rows are still rendered exactly as Kong composed
                them, in order.
              */
              const isTotal = row.kind === 'TOTAL'
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-baseline justify-between gap-4',
                    isTotal && 'mt-4 border-t border-line pt-4'
                  )}
                >
                  <dt className={isTotal ? 'font-medium text-foreground' : 'text-muted'}>
                    {row.label ?? row.kind}
                  </dt>
                  <dd
                    className={cn(
                      'tabular',
                      isTotal
                        ? 'font-display text-[1.625rem] leading-none text-foreground'
                        : 'text-muted'
                    )}
                  >
                    {money(Number(row.amountCents))}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}

        <div>
          <a
            href={booking.checkoutUrl ?? '#'}
            aria-disabled={!booking.checkoutUrl}
            className={buttonClass({
              size: 'lg',
              block: true,
              // An <a> cannot be `disabled`, so the unavailable state is
              // drawn and made unclickable rather than relying on an
              // attribute the element does not have.
              className: booking.checkoutUrl
                ? ''
                : 'pointer-events-none bg-line text-muted hover:opacity-100',
            })}
          >
            {booking.bookNowLabel}
          </a>
          {booking.waitlistExplanation && (
            <p className="mt-3 text-[0.8125rem] text-muted">
              {booking.waitlistExplanation}
            </p>
          )}
        </div>
      </div>

      {/*
        Availability, announced. `polite` so it waits for a pause rather
        than cutting across whatever is being read, and the region is in
        the DOM from the first render — a live region added at the moment
        it gains content is frequently not announced at all.
      */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/*
        On a phone only. The panel is the last thing on a long page, so
        this carries the price up to wherever the guest is reading and
        jumps them back down to it. Hidden from `lg` up, where the panel
        is already pinned beside the copy.
      */}
      <div className="lg:hidden">
        <StickyBar show={panelOffScreen && pastHero}>
          <Price
            cents={leadPrice == null ? null : Number(leadPrice)}
            size="sm"
            className="min-w-0 shrink"
          />
          <a href="#book" className={buttonClass({ size: 'md', className: 'shrink-0' })}>
            Check dates
          </a>
        </StickyBar>
      </div>
    </aside>
  )
}
