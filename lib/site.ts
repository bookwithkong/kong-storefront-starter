/**
 * Your site's identity and front-page copy.
 *
 * THIS IS THE FILE TO EDIT FIRST. Everything here is words and nothing
 * here is wiring — the name in the header, the browser title, and the
 * sentences on the hero. Change them and the site is yours.
 *
 * The name falls back to an environment variable so a deployment can
 * rebrand without a code change, which is useful if you run the same
 * template for more than one operator.
 */
export const site = {
  /** Shown in the header, the footer and the browser tab. */
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Kong Sunset Cruise',

  /** The <meta name="description">, and your search-result snippet. */
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
    'Private yacht cruises on the Andaman Sea, departing Langkawi at golden hour.',

  /** Where you are, shown under the footer. */
  location: process.env.NEXT_PUBLIC_SITE_LOCATION ?? 'Langkawi, Malaysia',

  /**
   * The hero.
   *
   * Deliberately specific rather than "Book your adventure today". A
   * headline that could sit on any booking site is the one thing
   * guaranteed not to sell yours — say the thing only you can say.
   */
  hero: {
    eyebrow: 'Langkawi · Andaman Sea',
    headline: 'The sea turns gold for about forty minutes.',
    subhead:
      'We sail out to meet it. Private yachts, a professional crew, and the limestone karsts on the way back in.',
    cta: 'See the fleet',
  },

  /** The band above the footer. */
  closing: {
    headline: 'The light does not wait. Neither should the booking.',
    cta: 'Check dates',
  },

  /** The label over the product list. */
  catalogueEyebrow: 'Two ways to sail',
} as const
