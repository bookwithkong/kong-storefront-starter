'use client'

import dynamic from 'next/dynamic'
import type { StarterProduct } from './booking-panel'

/**
 * Loads the booking panel in the browser only.
 *
 * Not a workaround — it is the right split for a booking site. The
 * product copy above is static and is what search engines index; the
 * panel is pure interaction, and everything it shows (availability,
 * prices) has to be live anyway, so there is nothing to gain from
 * rendering it at build time.
 *
 * It also settles "when is now". A statically generated page cannot bake
 * in a current date — one built in January would open its calendar on
 * January forever — and Next rightly refuses to prerender a component
 * that reads the clock. Rendering in the browser means there is exactly
 * one clock, the guest's.
 *
 * `ssr: false` must live in a Client Component; a Server Component may
 * not pass it.
 */
const BookingPanel = dynamic(
  () => import('./booking-panel').then(m => m.BookingPanel),
  {
    ssr: false,
    loading: () => (
      <aside className="h-80 animate-pulse border border-line bg-surface" />
    ),
  }
)

export function BookingPanelClient({ product }: { product: StarterProduct }) {
  return <BookingPanel product={product} />
}
