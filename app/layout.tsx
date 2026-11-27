import type { Metadata } from 'next'
import { Fraunces, IBM_Plex_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

/*
 * Two faces, one job each.
 *
 * Fraunces is a variable serif with an optical-size axis, so the display
 * headings get the tighter, higher-contrast cut at large sizes rather
 * than a text face scaled up. IBM Plex Sans handles everything
 * functional: labels, prices, the booking panel.
 *
 * next/font self-hosts both at build time, so there is no request to
 * Google at runtime and no layout shift. Swap the two imports to rebrand.
 */
const display = Fraunces({
  variable: '--font-display-stack',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK'],
})

const sans = IBM_Plex_Sans({
  variable: '--font-sans-stack',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

/**
 * The operator's Kong storefront origin — where Nora is served from.
 *
 * Not the API origin. The embed loader is served by the storefront, and
 * the host is what tells it which organization it belongs to.
 */
const STOREFRONT_ORIGIN = process.env.NEXT_PUBLIC_KONG_STOREFRONT_ORIGIN

export const metadata: Metadata = {
  title: {
    default: 'Kong Sunset Cruise',
    template: '%s · Kong Sunset Cruise',
  },
  description:
    'Private yacht cruises on the Andaman Sea, departing Langkawi at golden hour.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}

        {/*
          Nora, the operator's assistant.
          
          One script tag is the whole install. The ORIGIN carries the
          organization — the loader reads its own `src` to work out whose
          storefront it belongs to — so there is no key, no id and nothing
          to configure beyond pointing it at the right host.

          Chat is on by default for an install like this one. Add
          `data-chat="off"` to suppress it, and `data-product-id` if you
          also want the booking widget. Turning Nora off in Kong removes
          her from here too, with no change to this file.

          `afterInteractive` rather than `beforeInteractive`: she is a
          conversation, not page content, and must not sit in front of the
          catalogue rendering.
        */}
        {STOREFRONT_ORIGIN && (
          <Script src={`${STOREFRONT_ORIGIN}/embed.js`} strategy="afterInteractive" />
        )}
      </body>
    </html>
  )
}
