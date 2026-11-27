import Link from 'next/link'
import { notFound } from 'next/navigation'
import { kong, money, PRODUCT_QUERY, PRODUCTS_QUERY, type ProductSummary } from '@/lib/kong'
import { BookingPanelClient } from '@/components/booking-panel-client'
import type { StarterProduct } from '@/components/booking-panel'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'
import { Itinerary } from '@/components/itinerary'
import { Faqs } from '@/components/faqs'
import { Prose } from '@/components/prose'

/*
 * This route reads `params` to decide what to fetch, so Next cannot stream
 * an instant shell before knowing the product code. Declaring that
 * explicitly is the documented fix and silences the warning; the pages are
 * prerendered by generateStaticParams anyway, so there is nothing to wait
 * for in production.
 */
export const instant = false

/**
 * Build a page per product, refreshed on the catalogue's cache interval.
 *
 * Without this Next has no list of codes to prerender and the build
 * fails on "uncached runtime data". It is also the better shape: product
 * pages are static and fast, while the parts that must be live —
 * availability and price — are fetched from the browser.
 */
export async function generateStaticParams() {
  const data = await kong.request<{
    publicProductsByOrganization: { edges: { node: ProductSummary }[] }
  }>(PRODUCTS_QUERY, { organizationSlug: kong.organizationSlug })

  return data.publicProductsByOrganization.edges.map(e => ({
    code: e.node.productCode,
  }))
}

/** Real per-page titles, rather than one title for the whole site. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const data = await kong.request<{ publicProductDetails: StarterProduct | null }>(
    PRODUCT_QUERY,
    { organizationSlug: kong.organizationSlug, productCode: code }
  )
  const product = data.publicProductDetails
  if (!product) return {}
  return {
    title: product.name,
    description: product.shortDescription ?? product.tagline ?? undefined,
    openGraph: product.heroImageUrl
      ? { images: [{ url: product.heroImageUrl }] }
      : undefined,
  }
}

/** A list Kong returns as plain strings, rendered as a checked/crossed column. */
function Included({
  title,
  items,
  included,
}: {
  title: string
  items: ReadonlyArray<string>
  included: boolean
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="eyebrow text-muted">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map(item => (
          <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed">
            <span
              aria-hidden
              className={`mt-[0.3125rem] shrink-0 ${included ? 'text-accent' : 'text-muted'}`}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                {included ? (
                  <path
                    d="M1.5 7l3.5 3.5L11.5 3"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M2.5 2.5l8 8m0-8l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </span>
            <span className={included ? 'text-foreground' : 'text-muted'}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One product, with the booking panel beside it.
 *
 * The product is fetched on the SERVER and handed to a Client Component
 * as a prop. That matters for more than performance: `useBooking` needs a
 * referentially stable `product`, and a prop from a server render is
 * stable by construction. Building the object inside the client render
 * would make the hook spin.
 */
export default async function BookPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const data = await kong.request<{ publicProductDetails: StarterProduct | null }>(
    PRODUCT_QUERY,
    { organizationSlug: kong.organizationSlug, productCode: code }
  )

  const product = data.publicProductDetails
  // Null covers "no such code" AND "not published" — Kong deliberately
  // does not distinguish, so a guest cannot probe for hidden products.
  if (!product) notFound()

  // The gallery usually repeats the hero as its first entry, so the hero
  // is filtered out rather than shown twice.
  const gallery = (product.galleryImages ?? []).filter(
    img => img.url !== product.heroImageUrl
  )
  const inclusions = product.inclusions ?? []
  const exclusions = product.exclusions ?? []
  const itinerary = product.itinerary ?? []
  const faqs = product.faqs ?? []

  return (
    <>
      <SiteHeader overlay />

      <section className="relative isolate flex min-h-[26rem] items-end overflow-hidden bg-deep lg:min-h-[34rem]">
        {product.heroImageUrl && (
          <img
            src={product.heroImageUrl}
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-deep via-deep/65 to-deep/10"
        />
        <div className="mx-auto w-full max-w-6xl px-6 pb-14 pt-32">
          <Link
            href="/"
            className="eyebrow text-on-deep-muted transition-opacity hover:opacity-70"
          >
            &larr; All cruises
          </Link>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.05] tracking-tight text-balance text-on-deep">
            {product.name}
          </h1>
          {product.tagline && (
            <p className="mt-4 max-w-xl font-display text-lg italic text-on-deep-muted">
              {product.tagline}
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-16">
            {product.description && (
              <section>
                <Prose text={product.description} />
              </section>
            )}

            <Itinerary items={itinerary} />

            {(inclusions.length > 0 || exclusions.length > 0) && (
              <section className="grid gap-10 border-t border-line pt-10 sm:grid-cols-2">
                <Included title="What's included" items={inclusions} included />
                <Included title="Not included" items={exclusions} included={false} />
              </section>
            )}

            {gallery.length > 0 && (
              <section>
                <h2 className="font-display text-2xl">On board</h2>
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.map(img => (
                    <li key={img.url}>
                      <img
                        src={img.url}
                        alt={img.alt ?? ''}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Faqs items={faqs} />
          </div>

          {/*
            Sticky on desktop only. On a phone the panel follows the copy
            in normal flow — a pinned booking box on a small screen eats
            the viewport the guest is trying to read with.
          */}
          <div className="lg:sticky lg:top-8">
            <BookingPanelClient product={product} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
