import { Button, ButtonLink } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { kongLive, money } from '@/lib/kong'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { signOut } from './actions'
import { getGuestToken } from '@/lib/guest-session'
import { CancelButton, SignInForm } from './manage-client'

export const metadata = { title: 'Manage your booking' }

/*
 * Nothing here may be prerendered or cached: it is one guest's booking,
 * read with their own credential.
 *
 * No `force-dynamic` — this project has `cacheComponents` on, which
 * rejects that directive, and it would be redundant anyway: reading
 * `cookies()` already makes the route dynamic. The uncached `kongLive`
 * client is the other half of it, and the important half, because a
 * dynamic route can still sit in front of a cached fetch.
 */
export const instant = false

/**
 * A timeslot's start, as the guest should read it.
 *
 * Kong returns `startDate` and `startTime` ALREADY in the operator's
 * timezone — a 17:30 departure in Langkawi is "17:30", not an instant to
 * be converted. So this formats the parts and does no timezone maths at
 * all; running them through `new Date()` would reinterpret them in
 * whatever zone the server happens to sit in and shift the departure.
 */
function when(date: unknown, time: unknown) {
  if (typeof date !== 'string' || typeof time !== 'string') return null
  // Parsed as local parts, never as an instant.
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  if (!y || !m || !d) return null
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(y, m - 1, d, hh ?? 0, mm ?? 0))
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; order_reference?: string }>
}) {
  /*
    Kong appends these when it sends a guest back here after payment —
    see `returnUrl` in app/checkout/actions.ts. They say what HAPPENED;
    the booking itself is still read with the guest's own credential
    below, because a status in a query string is something anyone can
    type.
  */
  const { status, order_reference: returnedReference } = await searchParams
  const token = await getGuestToken()

  if (!token) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-20">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight">
            Manage your booking
          </h1>
          <div className="mt-10">
            <SignInForm />
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  // The token can be stale — it expires, and the guest may have cancelled
  // everything. Treat a failed read as "sign in again" rather than a crash.
  const order = await kongLive.guest
    .session(token)
    .order()
    .catch(() => null)

  if (!order) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-20">
          <h1 className="font-display text-3xl">Your session has expired</h1>
          <form action={signOut} className="mt-8">
            <Button size="lg">Sign in again</Button>
          </form>
        </main>
        <SiteFooter />
      </>
    )
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-accent">
              {order.order.orderReference}
            </p>
            <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">
              Hello, {order.booker.firstName}
            </h1>
          </div>
          <form action={signOut}>
            <Button variant="ghost">Sign out</Button>
          </form>
        </div>

        {status === 'success' && (
          <Callout
            tone="positive"
            eyebrow="Payment received"
            title="You're all set."
            role="status"
            className="mt-10"
          >
            A confirmation is on its way to {order.booker.email ?? 'your inbox'}
            {returnedReference ? ` for ${returnedReference}` : ''}.
          </Callout>
        )}

        {status === 'failed' && (
          <Callout
            eyebrow="Payment not completed"
            title="Nothing has been charged."
            role="status"
            className="mt-10"
          >
            Your booking is held below — you can pay from the link in your
            email, or start again.
          </Callout>
        )}

        <ul className="mt-12 space-y-8">
          {order.order.bookings.map(booking => {
            const product = booking.product as { name?: string }
            const slot = booking.timeslot as {
              startDate?: string
              startTime?: string
            }
            const cancelled = booking.status === 'CANCELLED'

            return (
              <li
                key={booking.id}
                className={`border border-line bg-surface p-8 ${cancelled ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h2 className="font-display text-2xl">
                    {product?.name ?? 'Your booking'}
                  </h2>
                  <span className="eyebrow text-muted">{booking.status}</span>
                </div>

                <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-line pt-5 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Reference</dt>
                    <dd className="tabular">{booking.bookingReference}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Guests</dt>
                    <dd className="tabular">{booking.partySize}</dd>
                  </div>
                  {when(slot?.startDate, slot?.startTime) && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">When</dt>
                      <dd className="tabular text-right">
                        {when(slot?.startDate, slot?.startTime)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Payment</dt>
                    <dd>{booking.paymentStatus}</dd>
                  </div>
                </dl>

                {/*
                  The server's composed rows, rendered in order — never
                  re-added. suppressPriceDisplay is the operator saying
                  "do not show this guest a price", and it is honoured
                  here for the same reason the confirmation email does.
                */}
                {!booking.suppressPriceDisplay &&
                  booking.priceBreakdown.length > 0 && (
                    <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
                      {booking.priceBreakdown.map((row, i) => (
                        <div key={i} className="flex justify-between gap-4">
                          <dt
                            className={
                              row.kind === 'TOTAL'
                                ? 'font-medium'
                                : 'text-muted'
                            }
                          >
                            {row.label ?? row.kind}
                          </dt>
                          <dd
                            className={`tabular ${row.kind === 'TOTAL' ? 'font-medium' : 'text-muted'}`}
                          >
                            {money(Number(row.amountCents))}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                {!cancelled && (
                  <div className="mt-6 flex flex-wrap items-start gap-4 border-t border-line pt-6">
                    <CancelButton
                      bookingReference={booking.bookingReference}
                      canCancel={
                        (booking.cancellationInfo as { canCancel?: boolean })
                          ?.canCancel === true
                      }
                    />
                    {/*
                      Rescheduling needs a date picker, which is the booking
                      panel's job — this starter sends the guest back to the
                      product rather than building a second one. canReschedule
                      says whether that is even on offer.
                    */}
                    {booking.canReschedule && (
                      <ButtonLink
                        href={`/manage/reschedule/${booking.bookingReference}`}
                        variant="secondary"
                      >
                        Move to another date
                      </ButtonLink>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
