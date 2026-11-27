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

## See it running

**[kong-storefront-starter.onrender.com](https://kong-storefront-starter.onrender.com)**

This repository, unmodified, pointed at a real operator's catalogue. Open a
cruise from the front page and pick a date: the booking panel fetches live
availability and a real quote from your browser, which is the part a
screenshot cannot show you. The photographs open in a lightbox, and on a
phone the price follows you down the page.

Two things to know before you judge it:

- **It is a live storefront for a real operator.** Browse it freely, but do
  not complete a checkout — the booking would be genuine.
- **It sleeps.** The demo runs on Render's free instance type, so the first
  request after a quiet spell can take up to a minute to wake. That is the
  host, not the template.

It is an ordinary Next.js app, so it runs anywhere Next runs — Render,
Vercel, Netlify, Railway, Fly, or your own box. See [Deploying
it](#deploying-it).

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

## Make it yours

Start with **`lib/site.ts`**. It holds the name, the description, the
location and every sentence on the front page — words only, no wiring.
Change them and the site is yours. Each one also reads an environment
variable first, so one deployment can be rebranded without a code change.

Then `app/globals.css` for colour and type, and `app/icon.svg` for the
favicon. See *Restyling it* below.

## Deploying it

It is an ordinary Next.js app, so anywhere that runs Next will do. Two
things narrow the field, and they are worth knowing before you pick:

**It needs a real Node runtime, not static file hosting.** Checkout creates
the order through a Server Action, the guest area is rendered per request,
and the catalogue is regenerated every five minutes. A static export breaks
all three — and would also break the photographs, because Kong's signed
image urls expire an hour after the build. Any plan advertised as "static
site hosting" is the wrong one.

**Host near Kong.** The Storefront API runs in **Singapore**. Every
server-rendered page and every checkout makes its Kong calls from your
server, so a host in Virginia adds a Pacific round trip to the one request
a guest is waiting on. Pick the closest region your provider offers.

| Host | Free tier | Pros | Cons |
|---|---|---|---|
| **Vercel** | Hobby — **non-commercial only** | Next.js is their own framework, so nothing needs configuring. Partial prerendering, ISR and Server Actions are all first-class. Fastest path from repo to url. | Selling tours is commercial use, so a real storefront needs Pro — see below. Functions default to US East, away from Kong. |
| **Render** | Yes, and no commercial restriction | A `render.yaml` ships in this repo, so setup is three clicks. Singapore region available. The free tier is genuinely usable for showing people. | Free instances sleep after about 15 minutes idle and take a while to wake. Render's own docs say the free tier is not for production. |
| **Hostinger** | None — 30-day money-back instead | Cheap, predictable monthly cost. Full control of the box, Singapore datacentre, and a managed Node option if you would rather not run one. | Shared plans cannot run this at all; you need VPS or Node.js hosting. On a plain VPS you own the updates, the process manager and the certificates. Introductory prices renew higher. |

**If you are only showing it to someone, Render's free tier is the one.**
It is the only one of the three that is both free and unrestricted, which is
why the [demo above](#see-it-running) runs there. **If you are actually
selling, pick on region and operating cost** — Vercel Pro for the least
work, Hostinger for the lowest predictable bill.

Netlify, Railway, Fly and your own box are equally fine; they are just not
documented here.

### Render

A `render.yaml` ships in this repo, so:

1. Push this to your own GitHub repository.
2. In Render, **New → Blueprint**, point it at the repo, and approve.
3. Set the environment variables from the table above in the dashboard.

Render builds with `npm run build` and serves with `npm run start`. The
free instance type sleeps after about fifteen minutes of inactivity and can
take up to a minute to wake, which is fine for showing someone and not for
a real storefront — move to a paid instance before you advertise it.

The [demo above](#see-it-running) is this repository deployed exactly this
way, on the free plan, so what you get from these three steps is what you
are looking at.

### Vercel

`npx vercel` from this directory, or import the repository at
vercel.com/new. Next.js is Vercel's own framework, so nothing needs
configuring; add the environment variables and deploy. Partial prerendering
and the five-minute revalidate are native there.

**The free Hobby plan does not cover this.** Vercel's
[fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
restrict Hobby to non-commercial personal use, and taking payment from
visitors is their own example of commercial use — which is the entire point
of this template. Commercial deployments need Pro, and Vercel reserves the
right to remove a Hobby deployment without notice. Use Hobby to try it;
upgrade before you take a booking.

One thing is worth configuring. Vercel runs functions in **Washington DC**
by default, and Kong is in Singapore — so checkout, the guest area and every
catalogue regeneration would cross the Pacific. Add a `vercel.json`:

```json
{ "regions": ["sin1"] }
```

Use whichever region is nearest you if your operator is elsewhere.

### Hostinger

Hostinger runs this on its
[VPS or Node.js](https://www.hostinger.com/nodejs-hosting) plans, which give
you a real Node runtime, SSR, ISR and API routes. Point the plan at your
repository, set Node 20+, build with `npm run build` and serve with
`npm run start`. Choose the Singapore datacentre if Kong is your backend.

There is no free tier — the trial is a 30-day money-back guarantee rather
than a free plan, so budget for it from day one. The advertised price is
also an introductory rate on a long commitment and renews higher; check the
renewal figure, not the headline, before comparing it with Render or Vercel.

**Not on shared hosting.** Hostinger's shared plans do not run a persistent
Node process — they can host a static export, which this app cannot produce
for the reasons above. If you are on a shared plan today, this needs an
upgrade rather than a workaround.

### Netlify, Railway, Fly, your own box

All fine. The only requirements are Node 20+, `npm run build`, and
`npm run start`.

### After it is up — two things, in this order

**1. Declare the deployed origin in Kong.** Website → Custom site, exactly
as it appears in the browser (`https://tours.example.com`, no trailing
slash). Until you do, the booking panel gets a 403 from the guest's
browser and the page looks broken for everyone but you.

**2. Set `NEXT_PUBLIC_SITE_ORIGIN` to the same value.** It is the
post-payment return destination, and a mismatch does not degrade quietly
— the booking fails.

A useful order of operations: deploy, copy the real URL, declare it in
Kong, set the variable, redeploy.

### Your own domain

Point a CNAME at your host and add the domain there — all three above
issue certificates automatically. Then **redo both steps above with the
new origin**, because `https://tours.example.com` and
`https://my-site.onrender.com` are different origins and Kong knows the
difference.

## Remembering past bookings

A returning guest sees their previous references on the sign-in form and
fills one in with a tap, instead of hunting for a confirmation email.

Stored in `localStorage`: the **reference and the product name only** —
never the guest token, never the surname. The token can cancel and
reschedule, so it stays in an httpOnly cookie that scripts cannot read. A
reference on its own opens nothing, because signing in also needs the
surname. There is a "Forget these" control for shared computers.

See `lib/recent-bookings.ts`.

## Changing it with an AI agent

Expected, and the repo is set up for it. **`AGENTS.md` is the brief** —
Claude Code, Cursor and the rest read it automatically. It records the
rules that are expensive to rediscover: never re-add the server's price
rows, never cache a guest's own data, never parse a slot time as an
instant, never render a control without asking the booking first.

Point your agent at it and ask for what you want. Then:

```bash
npm run verify     # typecheck, lint, production build
```

Treat that as the bar, not a rendering dev server. Several of the rules
in `AGENTS.md` fail only in a production build, only for a second
visitor, or only in another timezone — a page that looks right on your
machine is not evidence.

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
