import Link from 'next/link'
import { kong, PRODUCT_CARD_QUERY, type ProductCardExtras } from '@/lib/kong'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { CheckoutForm } from './checkout-form'

/*
 * The panel hands its selection over in the query string, because that is
 * what `buildCheckoutUrl` is for — your routing, not Kong's. The shape is
 * whatever `createCheckoutParams` produced.
 *
 * Treat it as untrusted. It came from a URL the guest can edit, so the
 * price shown here is re-read from Kong rather than trusted from the link,
 * and the order is priced by Kong again when it is created.
 */
interface Selection {
  productCode: string
  organizationSlug: string
  startTimeUtc: string
  endTimeUtc: string
  pricingSelections?: Array<{ pricingTierId: string; quantity: number }>
}

export const metadata = { title: 'Checkout' }

/*
 * The guest's selection arrives in the query string, so this route cannot
 * be prerendered without it — Next refuses to build a static shell around
 * data it has to wait for. Declaring the route blocking is the documented
 * answer for a page that is genuinely per-request, which a checkout is.
 */
export const instant = false

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
          <Link
            href="/"
            className="mt-8 inline-block bg-accent px-6 py-3 text-sm font-medium text-accent-foreground"
          >
            See the fleet
          </Link>
        </main>
        <SiteFooter />
      </>
    )
  }

  // Re-read the product so the summary shows a name, not a code.
  const data = await kong
    .request<{ publicProductDetails: (ProductCardExtras & { name?: string }) | null }>(
      PRODUCT_CARD_QUERY.replace('tagline', 'name tagline'),
      {
        organizationSlug: selection.organizationSlug,
        productCode: selection.productCode,
      }
    )
    .catch(() => null)

  const productName = data?.publicProductDetails?.name ?? selection.productCode
  const when = new Date(selection.startTimeUtc)
  const guests = (selection.pricingSelections ?? []).reduce(
    (sum, p) => sum + p.quantity,
    0
  )

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Link href={`/book/${selection.productCode}`} className="eyebrow text-muted hover:text-accent">
          &larr; Back to the cruise
        </Link>
        <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-tight">
          Almost aboard
        </h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <CheckoutForm selection={d ?? ''} />

          <aside className="border border-line bg-surface p-6 lg:sticky lg:top-8">
            <h2 className="eyebrow text-muted">Your booking</h2>
            <p className="mt-4 font-display text-xl leading-tight">{productName}</p>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">When</dt>
                <dd className="tabular text-right">
                  {new Intl.DateTimeFormat(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: process.env.NEXT_PUBLIC_KONG_TIMEZONE ?? 'UTC',
                  }).format(when)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Guests</dt>
                <dd className="tabular">{guests}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              {/*
                No total here on purpose. The price the guest sees must be
                the one Kong quotes at the moment of booking, and a figure
                carried in from a URL is neither current nor trustworthy.
              */}
              Your total is confirmed when the booking is created.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
