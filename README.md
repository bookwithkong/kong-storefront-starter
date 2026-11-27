# Kong storefront starter

A complete booking site on [`@bookwithkong/storefront`](https://www.npmjs.com/package/@bookwithkong/storefront).
It sells and it services: catalogue, product pages, checkout, and a guest
area where someone can find, move and cancel what they booked.

Clone it, point it at your organization, and change the parts you want.

```bash
npm install
cp .env.example .env.local   # then edit it
npm run dev                  # http://localhost:3100
```

## Point it at your organization

Everything environment-specific lives in `.env.local`:

| Variable | What it does |
|---|---|
| `KONG_ORGANIZATION_SLUG` | whose catalogue this site sells |
| `NEXT_PUBLIC_KONG_ORGANIZATION_SLUG` | the same slug, for the browser |
| `NEXT_PUBLIC_KONG_TIMEZONE` | the operator's timezone — departure times are rendered in it |
| `NEXT_PUBLIC_KONG_CURRENCY` | ISO code, e.g. `MYR`. Prices are formatted with it |
| `NEXT_PUBLIC_SITE_ORIGIN` | this site's own origin, for the post-payment return |
| `NEXT_PUBLIC_KONG_STOREFRONT_ORIGIN` | where the chat assistant is served from. Remove to drop it |
| `KONG_API_ORIGIN` | omit for production; set it to target staging |

### Two things you must declare in Kong

Under **Website → Custom site**, add this site's origin (e.g.
`https://tours.example.com`, or `http://localhost:3100` in development).
It authorises two separate things:

1. **browser calls** — the booking panel fetches availability and prices
   from the guest's browser, and Kong answers an undeclared origin with 403.
2. **the post-payment return** — an undeclared `returnUrl` **fails the
   booking** rather than being ignored, because a redirect target that
   silently did not apply is an open redirect.

Under **Settings → Organization settings → Advanced → Features**, turn on
**Guest Self-Management** if you want guests to cancel and move their own
bookings. With it off, `/manage` still shows the booking but the controls
are correctly disabled.

## How it is laid out

```
app/
  page.tsx                    catalogue — server-rendered, cached
  book/[code]/page.tsx        one product; the booking panel is the only client part
  checkout/                   guest details -> createOrder (a Server Action)
  manage/                     find a booking, see it, cancel it
  manage/reschedule/[ref]/    pick a new departure
components/
  ui/                         button, field, callout, reveal, sticky bar
  booking-panel.tsx           the only component that talks to Kong from the browser
  itinerary.tsx faqs.tsx prose.tsx
lib/
  kong.ts                     TWO clients — see below
  guest-session.ts            the guest's token, in an httpOnly cookie
```

### Two clients, on purpose

`lib/kong.ts` exports `kong` and `kongLive`.

`kong` opts into `force-cache` so catalogue pages serve statically.
`kongLive` sets `cache: 'no-store'` and is used for anything belonging to
one guest. A cached read of somebody's booking shows stale state at best
and, on a shared server, can serve one guest's order to the next person
who asks. **Caching is a per-query decision — there is no safe global
answer.**

### The guest's session

`createOrder` returns a `guestToken`. Checkout stores it in an **httpOnly**
cookie, which is why a guest returning from the payment processor is
already signed in and why nothing sensitive travels in the return URL.

Not `localStorage`: the token can cancel a booking, so one readable by
page scripts is one XSS away from a stranger cancelling someone's holiday.

## Restyling it

- **Colour and type**: `app/globals.css`. Every colour is a token on
  `:root`, redefined once for dark mode. Fonts are two `next/font` imports
  in `app/layout.tsx`.
- **Buttons, fields, callouts**: `components/ui/`. Variants describe
  intent (`primary`, `secondary`, `ghost`), not colour, so renaming the
  palette does not strand them.
- **Motion**: the keyframes live in `globals.css` and are switched off
  under `prefers-reduced-motion`. If you add a reveal animation, reset the
  hidden state there too — an element parked at `opacity: 0` whose
  animation is disabled is not unanimated, it is invisible.
- **Favicon**: replace `app/icon.svg`.

## Things worth keeping

A few behaviours look like details and are not:

- **Render the price rows the server composed**, in order, and never add
  them up yourself. `priceBreakdown` already accounts for the operator's
  tax regime; recombining the parts is the bug it exists to prevent.
- **Honour `suppressPriceDisplay`** — it is the operator saying "do not
  show this guest a price".
- **Use `cancellationInfo.canCancel` and `canReschedule`** to decide
  whether to render a control. They are false when the operator does not
  allow self-service, and when the booking is cancelled, completed or
  inside its cutoff — so the button disappears for the same reasons the
  server would refuse.
- **Slot times arrive as `startDate` + `startTime` in the operator's
  timezone.** Format the parts. Passing them through `new Date()`
  reinterprets them in the server's zone and moves the departure.
- **`cheapestBookableTotalCents`, not a tier price**, for any "from"
  figure — it includes mandatory charges and tax.
- **A refusal is not an error.** `cancelBooking` and `rescheduleBooking`
  answer `{ success, message }`; a `false` with a message is the
  operator's rules, written for the guest. Show it.

## Not included

Payment UI (Kong hands you a `checkoutUrl`), liability waivers, and review
collection. Everything else a guest-facing booking site needs is here.
