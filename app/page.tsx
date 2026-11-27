import Link from 'next/link'
import {
  describeDuration,
  kong,
  money,
  PRODUCT_CARD_QUERY,
  PRODUCTS_QUERY,
  type ProductCardExtras,
  type ProductSummary,
} from '@/lib/kong'
import { SiteFooter, SiteHeader } from '@/components/site-chrome'

/**
 * The catalogue, rendered on the server.
 *
 * Server-side is the default here on purpose: a server sends no Origin
 * header, so CORS never applies and you need to declare nothing with Kong
 * to make this work. The trade is that every guest reaches Kong from THIS
 * server's address, so they share one rate-limit bucket. Fetch from the
 * browser instead when you outgrow that, and declare your origin in Kong
 * under Website -> Custom site.
 */
export default async function HomePage() {
  const data = await kong.request<{
    publicProductsByOrganization: {
      totalCount: number
      edges: { node: ProductSummary }[]
    }
  }>(PRODUCTS_QUERY, { organizationSlug: kong.organizationSlug })

  const products = data.publicProductsByOrganization.edges.map(e => e.node)

  /*
   * The tagline and inclusions live on the DETAILS type, not the listing,
   * so each card needs a second read. In parallel, not in sequence — and
   * see PRODUCT_CARD_QUERY for when this pattern stops being appropriate.
   */
  const extrasList = await Promise.all(
    products.map(p =>
      kong
        .request<{ publicProductDetails: ProductCardExtras | null }>(
          PRODUCT_CARD_QUERY,
          { organizationSlug: kong.organizationSlug, productCode: p.productCode }
        )
        .then(r => r.publicProductDetails)
        // One card losing its tagline must not take down the home page.
        .catch(() => null)
    )
  )
  const extras = new Map(
    extrasList.filter(e => e !== null).map(e => [e.productCode, e])
  )
  // The hero borrows the first product's photograph rather than shipping
  // its own asset, so the site has a hero on day one with nothing to
  // upload. Replace it with your own when you have one.
  const hero = products.find(p => p.heroImageUrl)

  return (
    <>
      <SiteHeader overlay />

      <section className="relative isolate flex min-h-[32rem] items-end overflow-hidden bg-deep lg:min-h-[40rem]">
        {hero?.heroImageUrl && (
          <img
            src={hero.heroImageUrl}
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        {/*
          Two stacked scrims, not one. A flat overlay dulls the whole
          photograph to lift text that only sits at the bottom; a gradient
          keeps the sky intact and darkens only where the words are.
        */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-deep via-deep/70 to-deep/10"
        />

        <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-32 lg:pb-24">
          <p className="eyebrow rise text-on-deep-muted">Langkawi · Andaman Sea</p>
          <h1
            className="rise mt-4 max-w-2xl font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight text-balance text-on-deep"
            style={{ animationDelay: '80ms' }}
          >
            The sea turns gold for about forty minutes.
          </h1>
          <p
            className="rise mt-5 max-w-md text-[0.9375rem] leading-relaxed text-on-deep-muted"
            style={{ animationDelay: '160ms' }}
          >
            We sail out to meet it. Private yachts, a professional crew, and
            the limestone karsts on the way back in.
          </p>
          <a
            href="#fleet"
            className="rise mt-8 inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={{ animationDelay: '240ms' }}
          >
            See the fleet
          </a>
        </div>
      </section>

      <main id="fleet" className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <p className="eyebrow text-accent">Two ways to sail</p>

        <div className="mt-12 space-y-20 lg:space-y-28">
          {products.map((product, i) => (
            <article
              key={product.productCode}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              {/*
                Alternate which side the photograph sits on. With only two
                products a repeated layout reads as a template; alternating
                reads as a composition.

                `lg:order-last` on odd rows rather than reordering the DOM,
                so the reading order stays image-then-copy for a screen
                reader regardless of which side it is painted on.
              */}
              <div className={i % 2 === 1 ? 'lg:order-last' : undefined}>
                {/*
                  A plain <img>, not next/image. next/image would need every
                  Kong storage host in next.config, and it rewrites the url —
                  which breaks the signed-token images Kong returns for
                  private media. Swap it in once you know your own media is
                  public and you have listed the host.
                */}
                {product.heroImageUrl ? (
                  <img
                    src={product.heroImageUrl}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                    loading={i === 0 ? undefined : 'lazy'}
                  />
                ) : (
                  <div className="aspect-[4/3] w-full bg-line" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight tracking-tight text-balance">
                  {product.name}
                </h2>
                {extras.get(product.productCode)?.tagline && (
                  <p className="mt-3 font-display text-lg italic text-accent">
                    {extras.get(product.productCode)!.tagline}
                  </p>
                )}
                {product.shortDescription && (
                  <p className="mt-5 max-w-prose text-[0.9375rem] leading-relaxed text-muted">
                    {product.shortDescription}
                  </p>
                )}

                {/*
                  Facts, not adjectives. Everything on this line is a value
                  Kong returned; a card that promises "unforgettable" says
                  less than one that says how long the boat is out.
                */}
                {(() => {
                  const extra = extras.get(product.productCode)
                  const facts = [
                    describeDuration(extra?.scheduledActivityConfig ?? null),
                    extra?.inclusions?.length
                      ? `${extra.inclusions.length} things included`
                      : null,
                  ].filter(Boolean)
                  if (facts.length === 0) return null
                  return (
                    <ul className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                      {facts.map((fact, j) => (
                        <li key={j} className="flex items-center gap-3">
                          {j > 0 && (
                            <span aria-hidden className="size-1 rounded-full bg-line" />
                          )}
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  )
                })()}

                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line pt-6">
                  {/*
                    cheapestBookableTotalCents, not a tier price: the cheapest
                    total a guest can actually be charged, mandatory fees and
                    tax included. A tier price understates anything with a
                    minimum party size or a per-booking fee, and "from 20" that
                    becomes 35 at checkout is the complaint that causes.
                  */}
                  {product.cheapestBookableTotalCents != null && (
                    <p className="text-sm text-muted">
                      from{' '}
                      <span className="tabular text-xl font-medium text-foreground">
                        {money(product.cheapestBookableTotalCents)}
                      </span>
                    </p>
                  )}
                  <Link
                    href={`/book/${product.productCode}`}
                    className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Check dates
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/*
        A page needs an ending. Without this the last product block simply
        stops and leaves a band of dead space above the footer.

        The copy here is copy — it makes no claim about the boats, the
        crew or the schedule, because anything factual belongs in Kong
        where the operator maintains it, not hardcoded in a template.
      */}
      <section className="bg-deep">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-tight text-balance text-on-deep">
            The light does not wait. Neither should the booking.
          </p>
          <a
            href="#fleet"
            className="shrink-0 bg-accent px-7 py-3.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Check dates
          </a>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
