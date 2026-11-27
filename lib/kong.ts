import { createStorefrontClient, KONG_API_ORIGIN } from '@bookwithkong/storefront'

/**
 * One client for the whole site.
 *
 * Module scope, not per request: it holds no state, so a second one buys
 * nothing. The env vars live here, in your config — the package reads no
 * environment itself, because `process.env` does not exist in a browser
 * and no variable name is portable across bundlers.
 */
export const kong = createStorefrontClient({
  organizationSlug: process.env.KONG_ORGANIZATION_SLUG ?? 'your-slug',
  origin: process.env.KONG_API_ORIGIN ?? KONG_API_ORIGIN.production,

  /**
   * Catalogue reads, cached for five minutes.
   *
   * This is why the client takes a `fetch` rather than calling the global
   * one. GraphQL goes over POST, and Next does not cache POST by default,
   * so a page fetching products is "uncached runtime data" and the build
   * refuses to prerender it. Opting in here means the catalogue is
   * statically served and refreshed in the background.
   *
   * Only safe for the catalogue. Availability and prices must NOT be
   * cached — a guest would be shown a slot somebody else has taken — and
   * they are not: both are fetched from the browser by `useBooking`,
   * through a different client with no caching at all.
   */
  fetch: (input, init) =>
    fetch(input, { ...init, cache: 'force-cache', next: { revalidate: 300 } }),
})

/**
 * A SECOND client, with no caching at all.
 *
 * The catalogue client above opts into `force-cache` so product pages can
 * be statically served. That is exactly wrong for anything belonging to
 * one guest: a cached read would show someone the booking state from five
 * minutes ago, and — far worse on a shared server — could serve one
 * guest's order to the next person who asked.
 *
 * So guest reads get their own client. Same endpoint, same organization,
 * no cache. The split is the point: caching is a per-QUERY decision, not a
 * per-app one, and there is no safe global answer.
 */
export const kongLive = createStorefrontClient({
  organizationSlug: process.env.KONG_ORGANIZATION_SLUG ?? 'your-slug',
  origin: process.env.KONG_API_ORIGIN ?? KONG_API_ORIGIN.production,
  fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
})

/** Only the fields these pages render. Add what you need; nothing is fixed. */
export const PRODUCTS_QUERY = `
  query Products($organizationSlug: String!) {
    publicProductsByOrganization(organizationSlug: $organizationSlug) {
      totalCount
      edges {
        node {
          productCode
          name
          shortDescription
          heroImageUrl
          cheapestBookableTotalCents
          # Listing-only facts worth putting on a card. There is no
          # tagline on PublicProductListing -- that lives on
          # PublicProductDetails, and asking for it here is a 400.
          nextAvailableDate
          availableSlots7d
        }
      }
    }
  }
`

export const PRODUCT_QUERY = `
  query Product($organizationSlug: String!, $productCode: String!) {
    publicProductDetails(organizationSlug: $organizationSlug, productCode: $productCode) {
      productCode organizationSlug name description template
      tagline shortDescription
      heroImageUrl
      galleryImages { url alt role sortOrder }
      inclusions exclusions whatToBring
      itinerary { itemName description durationMinutes location }
      faqs { question answer }
      reviewSummary { averageRating totalReviews }
      minBookingCapacity maxBookingCapacity
      rentalConfig { durationUnit }
      appointmentConfig { durationUnit durationMode }
      accommodationConfig { endTimeConstraint }
      scheduledActivityConfig { durationUnit fixedDurationValue }
      eventConfig { fixedDurationValue }
      generalAdmissionConfig { fixedDurationValue }
      pricingTiers { pricingTierId name isActive priceCents defaultQuantity minQuantity maxQuantity }
      options {
        id optionName sortOrder description
        minBookingCapacity maxBookingCapacity
        rentalConfig { durationUnit }
        appointmentConfig { durationUnit durationMode }
        accommodationConfig { endTimeConstraint }
        scheduledActivityConfig { durationUnit fixedDurationValue }
        eventConfig { fixedDurationValue }
        generalAdmissionConfig { fixedDurationValue }
        pricingTiers { pricingTierId name isActive priceCents defaultQuantity minQuantity maxQuantity }
        addOns {
          addOnId name description priceCents constraintType maxQuantity
          heroImageUrl effectiveAmountThresholdCents quantityPerUnit
          displaySurfaces sortOrder
        }
      }
    }
  }
`

/**
 * A product image as Kong returns it.
 *
 * NOTE the lifetime. Media that lives in a private bucket comes back as a
 * SIGNED url that expires one hour after the query — the token carries its
 * own `exp`. Media in a public bucket comes back unsigned and permanent.
 * Kong returns both shapes from the same field, so you cannot tell which
 * you have without decoding the url.
 *
 * That matters here because this site PRERENDERS product pages. A signed
 * url baked into static HTML renders fine at build time and 404s an hour
 * later. Two ways out, depending on how you host:
 *
 *   - Revalidate faster than the token expires (this site uses 5 minutes,
 *     comfortably inside the hour), so each regeneration mints fresh urls.
 *   - Or proxy images through your own route and re-fetch the url per
 *     request, which also stops the token appearing in your HTML.
 *
 * A fully static export with no revalidation will break. That is a
 * property of the API, not of Next.
 */
export interface ProductImage {
  url: string
  alt: string | null
  role: string | null
  sortOrder: number | null
}

export interface ProductSummary {
  productCode: string
  name: string
  shortDescription: string | null
  heroImageUrl: string | null
  cheapestBookableTotalCents: number | null
  /** ISO datetime of the next bookable departure, or null if nothing is. */
  nextAvailableDate: string | null
  /** How many departures exist in the next seven days. */
  availableSlots7d: number | null
}

/**
 * The extra fields a home-page card wants, which the LISTING does not carry.
 *
 * `tagline` and `inclusions` live only on PublicProductDetails. Fetching
 * details per product is an N+1, and that is a real cost — fine for the
 * handful of experiences a boutique operator sells, wrong for a catalogue
 * of fifty. If yours is large, drop this query and build cards from the
 * listing alone; every field on it is already enough for a grid.
 */
export const PRODUCT_CARD_QUERY = `
  query ProductCard($organizationSlug: String!, $productCode: String!) {
    publicProductDetails(organizationSlug: $organizationSlug, productCode: $productCode) {
      productCode
      tagline
      inclusions
      scheduledActivityConfig { durationUnit fixedDurationValue }
    }
  }
`

export interface ProductCardExtras {
  productCode: string
  tagline: string | null
  inclusions: ReadonlyArray<string> | null
  scheduledActivityConfig: {
    durationUnit: string | null
    fixedDurationValue: number | null
  } | null
}

/**
 * A fixed duration, as a guest would say it.
 *
 * Kong reports the unit alongside the number, so this converts rather than
 * assuming minutes — a value of 2 means two HOURS or two MINUTES depending
 * on the unit, and guessing produces a "2 minute cruise".
 */
export function describeDuration(
  config: ProductCardExtras['scheduledActivityConfig']
): string | null {
  const value = config?.fixedDurationValue
  if (value == null || value <= 0) return null
  const minutes =
    config?.durationUnit === 'HOURS'
      ? value * 60
      : config?.durationUnit === 'MINUTES'
        ? value
        : null
  if (minutes == null) return null
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return `${h} hour${h === 1 ? '' : 's'}`
  }
  return `${minutes} min`
}

/**
 * Cents to something a guest reads, WITH its currency.
 *
 * The currency is not decoration. A booking page that says "from 2,700"
 * and means ringgit, to a reader who assumes dollars, has misquoted the
 * price by a factor of four — so the symbol travels with the number
 * everywhere, and there is no variant of this helper that omits it.
 *
 * `Intl.NumberFormat` also picks the right number of decimal places per
 * currency, which a hardcoded `.toFixed(2)` cannot: JPY has none.
 *
 * NEXT_PUBLIC_ so the same helper works in the browser panel and on the
 * server. Kong returns the operator's currency on the organization too —
 * read it from there instead if you sell for more than one operator.
 */
const CURRENCY = process.env.NEXT_PUBLIC_KONG_CURRENCY ?? 'USD'

const currencyFormat = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: CURRENCY,
  // Without this, MYR renders as the code "MYR 250.00" rather than
  // "RM 250.00" — correct, but not what anyone in the market reads.
  currencyDisplay: 'narrowSymbol',
})

export const money = (cents: number | null | undefined) =>
  cents == null ? null : currencyFormat.format(cents / 100)
