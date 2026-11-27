import Link from 'next/link'
import { site } from '@/lib/site'

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  /*
   * Over a hero photograph the header has to read on the scrim, not on
   * the page background — so it takes the fixed `--on-deep` tokens rather
   * than `--foreground`, which flips with the theme.
   */
  const tone = overlay
    ? 'text-on-deep border-transparent'
    : 'text-foreground border-line'

  return (
    <header
      className={`${overlay ? 'absolute inset-x-0 top-0 z-20' : 'border-b'} ${tone}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-lg tracking-tight">
          {site.name}
        </Link>
        <Link
          href="/#fleet"
          className={`eyebrow transition-opacity hover:opacity-70 ${
            overlay ? 'text-on-deep' : 'text-muted'
          }`}
        >
          Book a cruise
        </Link>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {site.name} · Langkawi, Malaysia
        </p>
        <p>
          <Link href="/manage" className="underline underline-offset-4 hover:text-accent">
            Manage a booking
          </Link>
        </p>
        <p>
          Booking powered by{' '}
          <a
            href="https://bookwithkong.com"
            className="text-foreground underline underline-offset-4 hover:text-accent"
          >
            Kong
          </a>
        </p>
      </div>
    </footer>
  )
}
