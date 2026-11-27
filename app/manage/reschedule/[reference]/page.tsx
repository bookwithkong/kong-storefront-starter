import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { orgDateTimeToUtc } from '@bookwithkong/storefront'
import { kongLive, PRODUCT_QUERY } from '@/lib/kong'
import { getGuestToken } from '@/lib/guest-session'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { ReschedulePicker, type SlotChoice } from './reschedule-client'

export const metadata = { title: 'Move your booking' }
export const instant = false

const DAY = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const TIME = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const token = await getGuestToken()
  if (!token) notFound()

  const session = kongLive.guest.session(token)
  const order = await session.order().catch(() => null)
  const booking = order?.order.bookings.find(
    b => b.bookingReference === reference
  )

  /*
    404 rather than an error page when the booking is not on this guest's
    order. The token names a set of orders, so a reference that is not in
    them is either a typo or somebody guessing — and neither deserves a
    different answer.
  */
  if (!booking) notFound()

  // Honour the operator's switch here too, not just on the button that
  // linked here. A guest who bookmarked this URL must meet the same rule.
  if (!booking.canReschedule) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="font-display text-3xl">This booking can&apos;t be moved</h1>
          <p className="mt-3 text-sm text-muted">
            Please contact us and we&apos;ll sort it out with you directly.
          </p>
          <ButtonLink href="/manage" size="lg" className="mt-8">
            Back to my booking
          </ButtonLink>
        </main>
        <SiteFooter />
      </>
    )
  }

  const product = booking.product as { productCode?: string; name?: string }
  const option = booking.option as { id?: string }
  if (!product.productCode || !option.id) notFound()

  /*
    Availability needs an intended party, and the guest order does not
    carry pricing tier IDs — only names. So the tiers are re-read from the
    product and the booking's own partySize is used as the quantity, which
    is the right question anyway: "what is free for this many people".
  */
  const details = await kongLive
    .request<{
      publicProductDetails: {
        options: Array<{
          id: string
          pricingTiers: Array<{ pricingTierId: string; minQuantity: number | null }>
        }>
      } | null
    }>(PRODUCT_QUERY, {
      organizationSlug: kongLive.organizationSlug,
      productCode: product.productCode,
    })
    .catch(() => null)

  const tier = details?.publicProductDetails?.options.find(
    o => o.id === option.id
  )?.pricingTiers[0]
  if (!tier) notFound()

  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const availability = await kongLive
    .availability(
      product.productCode,
      kongLive.organizationSlug,
      iso(today),
      iso(new Date(today.getTime() + 60 * 864e5)),
      {
        pricingItems: [
          {
            pricingTierId: tier.pricingTierId,
            quantity: Math.max(booking.partySize, tier.minQuantity ?? 1),
          },
        ],
      },
      option.id
    )
    .catch(() => null)

  const slots: SlotChoice[] = (availability?.timeslots ?? [])
    .filter(s => s.capacityAvailable > 0)
    .slice(0, 40)
    .map(s => {
      /*
        startDate/startTime are the OPERATOR's wall clock. The mutation
        wants UTC instants, so they are converted with the package's own
        helper rather than by hand — the same function the booking panel
        uses, so a slot means the same thing in both places.
      */
      const tz = availability?.timezone ?? 'UTC'
      const startDateTime = orgDateTimeToUtc(s.startDate, s.startTime, tz)
      const endDateTime = orgDateTimeToUtc(
        s.endDate ?? s.startDate,
        s.endTime,
        tz
      )
      const local = new Date(`${s.startDate}T${s.startTime}`)
      return {
        id: s.id,
        startDateTime,
        endDateTime,
        day: DAY.format(local),
        label: TIME.format(local),
      }
    })

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/manage" className="eyebrow text-muted hover:text-accent">
          &larr; Back to my booking
        </Link>
        <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-tight">
          Move your booking
        </h1>
        <p className="mt-3 text-sm text-muted">
          {product.name} · {booking.partySize}{' '}
          {booking.partySize === 1 ? 'guest' : 'guests'} · currently{' '}
          {booking.bookingReference}
        </p>

        <div className="mt-12">
          {slots.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing else is available in the next two months. Please get in
              touch and we&apos;ll find you a date.
            </p>
          ) : (
            <ReschedulePicker
              bookingReference={booking.bookingReference}
              slots={slots}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
