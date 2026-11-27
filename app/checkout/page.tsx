import Link from 'next/link'
import {
  CHECKOUT_SUMMARY_QUERY,
  kong,
  kongLive,
  money,
  type CheckoutSummary,
} from '@/lib/kong'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { ButtonLink } from '@/components/ui/button'
import { CheckoutForm } from './checkout-form'

/*
 * The guest's selection arrives in the query string, because that is what
 * `buildCheckoutUrl` is for — your routing, not Kong's.
 *
 * Treat it as untrusted. It came from a URL the guest can edit, so the
 * price below is QUOTED FROM KONG rather than read from the link, and the
 * order is priced again by Kong when it is created. A total carried in a
 * query string is a number anybody can type.
 */
interface Selection {
  productCode: string
  organizationSlug: string
  optionId: string
  startTimeUtc: string
  endTimeUtc: string
  durationMinutes?: number | null
  pricingSelections?: Array<{ pricingTierId: string; quantity: number }>
  addOnSelections?: Array<{ addOnId: string; quantity: number }> | null
}

export const metadata = { title: 'Checkout' }
export const instant = false

const WHEN = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: process.env.NEXT_PUBLIC_KONG_TIMEZONE ?? 'UTC',
})
const TIME = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: process.env.NEXT_PUBLIC_KONG_TIMEZONE ?? 'UTC',
})

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>
}) {
  const { d } = await searchParams

  let selection: Selection | null = null
  try {
    selection = d ? (JSON.parse(d) as Selection) : null
  } catch {
    selection = null
  }

  if (!selection?.productCode) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl">Nothing to book yet</h1>
          <p className="mt-3 text-sm text-muted">
            Pick a cruise and a departure, and we will bring you back here.
          </p>
          <ButtonLink href="/" size="lg" className="mt-8">
            See the fleet
          </ButtonLink>
        </main>
        <SiteFooter />
      </>
    )
  }

  /*
   * Both reads in parallel. The summary is catalogue data and comes from
   * the cached client; the quote is a live price and must not be cached —
   * it depends on the party, the date and whatever rules the operator has
   * running today.
   */
  const [summaryResult, quote] = await Promise.all([
    kong
      .request<{ publicProductDetails: CheckoutSummary | null }>(
        CHECKOUT_SUMMARY_QUERY,
        {
          organizationSlug: selection.organizationSlug,
          productCode: selection.productCode,
        }
      )
      .catch(() => null),
    kongLive
      .quote({
        productCode: selection.productCode,
        organizationSlug: selection.organizationSlug,
        optionId: selection.optionId,
        startDateTime: selection.startTimeUtc,
        endDateTime: selection.endTimeUtc,
        pricingItems: selection.pricingSelections ?? [],
        ...(selection.addOnSelections?.length
          ? { addOns: selection.addOnSelections }
          : {}),
        ...(selection.durationMinutes != null
          ? { durationMinutes: selection.durationMinutes }
          : {}),
      })
      // A quote that fails must not block the booking — Kong prices the
      // order again on creation, which is the number that actually binds.
      .catch(() => null),
  ])

  const product = summaryResult?.publicProductDetails ?? null
  const productName = product?.name ?? selection.productCode
  const optionName = product?.options.find(
    o => o.id === selection.optionId
  )?.optionName
  const when = new Date(selection.startTimeUtc)
  const guests = (selection.pricingSelections ?? []).reduce(
    (sum, p) => sum + p.quantity,
    0
  )

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-14 lg:py-20">
        <Link
          href={`/book/${selection.productCode}`}
          className="eyebrow text-muted transition-colors hover:text-accent"
        >
          &larr; Back to the cruise
        </Link>
        <h1 className="mt-5 max-w-xl font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-balance">
          Almost aboard
        </h1>
        <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">
          One last thing — tell us who is coming, and the crew will have
          everything ready.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-16">
          <CheckoutForm selection={d ?? ''} productName={productName} />

          {/*
            The ticket.

            Photograph first, on purpose: a guest about to pay should see
            what they are buying. Everything below it is the same
            information the form will submit, so there is no moment where
            the two could disagree.
          */}
          <aside className="lg:sticky lg:top-8">
            <div className="overflow-hidden border border-line bg-surface">
              {product?.heroImageUrl && (
                <img
                  src={product.heroImageUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              )}

              <div className="p-7">
                <p className="eyebrow text-accent">Your booking</p>
                <h2 className="mt-3 font-display text-2xl leading-tight text-balance">
                  {productName}
                </h2>
                {optionName && optionName !== 'Default' && (
                  <p className="mt-1 text-sm text-muted">{optionName}</p>
                )}

                <div className="mt-6 border-t border-line pt-6">
                  <p className="eyebrow text-muted">Departing</p>
                  <p className="tabular mt-2 font-display text-xl leading-tight">
                    {WHEN.format(when)}
                  </p>
                  <p className="tabular mt-1 text-sm text-muted">
                    {TIME.format(when)} · {guests}{' '}
                    {guests === 1 ? 'guest' : 'guests'}
                  </p>
                </div>

                {/*
                  Kong's own rows, in Kong's own order, never re-added
                  here. This is a quote for exactly the selection the
                  form will submit — not a figure carried in the URL,
                  which the guest could have edited.
                */}
                {quote && (
                  <dl className="mt-6 space-y-2 border-t border-line pt-6 text-sm">
                    {quote.priceBreakdown.map((row, i) => (
                      <div
                        key={i}
                        className={`flex justify-between gap-4 ${
                          row.kind === 'TOTAL'
                            ? 'border-t border-line pt-3 text-base'
                            : ''
                        }`}
                      >
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
                          className={`tabular ${
                            row.kind === 'TOTAL'
                              ? 'font-display text-xl'
                              : 'text-muted'
                          }`}
                        >
                          {money(Number(row.amountCents))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <p className="mt-6 text-xs leading-relaxed text-muted">
                  No payment is taken on this page. We confirm the booking
                  first, then send you to pay.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
