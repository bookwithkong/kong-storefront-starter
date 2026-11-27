# Working on this storefront

A booking site built on [`@bookwithkong/storefront`](https://www.npmjs.com/package/@bookwithkong/storefront),
talking to Kong's Storefront API. Clone-and-customise is the intended use,
and changing it with an agent's help is expected — this file is what makes
that safe.

Read this before changing anything. The rules below are not style
preferences; each one is a bug that has already happened.

## Verify your work

```bash
npm run verify     # typecheck, lint and a production build
```

Run it before you claim to be finished. A dev server that renders is not
evidence: several of the rules below fail only in a production build, only
on a second visitor, or only in another timezone.

There are no unit tests. The build and the typechecker are the safety net,
so **do not weaken types to make something compile** — a cast past an
error is how the one bug this template documents most loudly got in.

## Where things go

| Want to change | Edit |
|---|---|
| Wording, site name, hero copy | `lib/site.ts` — words only, no wiring |
| Colour, type, spacing tokens | `app/globals.css` |
| Buttons, inputs, callouts | `components/ui/` |
| Favicon | `app/icon.svg` |
| What the catalogue queries | `lib/kong.ts` |

Prefer editing `lib/site.ts` over editing JSX. Most "change the copy"
requests are satisfied there, and a change there cannot break a query.

## Rules that must not be broken

**Never re-add the price rows.** `priceBreakdown` is composed by the
server and already accounts for the operator's tax regime. Render the rows
in order. Summing `amountCents + taxCents` yourself double-charges tax for
every tax-inclusive operator — this has shipped three times on other
surfaces.

**Never cache a guest's own data.** `lib/kong.ts` exports two clients:
`kong` (cached, catalogue) and `kongLive` (`no-store`, anything belonging
to one guest). Using `kong` for a booking shows stale state at best and,
on a shared server, serves one guest's order to the next person who asks.

**Never put the guest token in `localStorage` or a URL.** It can cancel
and reschedule. It lives in an httpOnly cookie (`lib/guest-session.ts`),
which is also why nothing sensitive rides the post-payment redirect.

`lib/recent-bookings.ts` does use localStorage, and does not break this
rule — it stores the order REFERENCE and a product name, never the token
and never the surname. A reference alone opens nothing, because
`guest.login` wants a surname with it. Keep it that way: storing both
halves would turn a convenience into a credential pair sitting in plain
text on a possibly shared computer.

**Never run a slot time through `new Date(dateString)`.** Kong returns
`startDate` and `startTime` already in the OPERATOR's timezone. Format the
parts. Parsing them as an instant reinterprets them in the server's zone
and silently moves the departure — the site will look right to you and be
wrong for everyone elsewhere.

**Never render a control without asking the booking first.**
`cancellationInfo.canCancel` and `canReschedule` are false when the
operator has self-management switched off, and when the booking is
cancelled, completed or inside its cutoff. A button that invites a click
the server will refuse is worse than no button.

**Never treat `success: false` as an error.** `cancelBooking` and
`rescheduleBooking` return `{ success, message }`. A `false` is the
operator's rules answering, with a message written for the guest. Show it
verbatim.

**Honour `suppressPriceDisplay`.** It is the operator saying "do not show
this guest a price".

**Use `cheapestBookableTotalCents` for any "from" figure.** A tier price
excludes mandatory charges and tax, so "from 20" becomes 35 at checkout.

**Reduced motion must not hide content.** Animations that start at
`opacity: 0` need their hidden state reset in the
`prefers-reduced-motion` block too — see `.reveal` in `app/globals.css`.
An element parked at `opacity: 0` whose animation is disabled is not
unanimated, it is invisible.

**Never read `localStorage` during render.** It does not exist on the
server, so the server's HTML and the browser's first render disagree —
a hydration mismatch. Start empty and fill in from an effect, and defer
the `setState` (see `lib/recent-bookings.ts` and
`components/ui/reveal.tsx`): a synchronous `setState` inside an effect
re-renders before paint and the linter will reject it.

## Two things that fail outside this repo

Both produce confusing symptoms, and neither is fixable in code:

**The site's origin must be declared in Kong** (Website → Custom site).
Undeclared, the booking panel gets a 403 from the guest's browser — the
page looks broken to everyone except whoever has `localhost` declared.

**`NEXT_PUBLIC_SITE_ORIGIN` must match that declared origin exactly.** It
is the post-payment return destination, and a mismatch **fails the
booking** rather than being ignored, because a redirect target that
silently did not apply would be an open redirect.

If a booking fails or availability is empty, check these before reading
any code.

## Changing the Kong queries

`lib/kong.ts` holds the GraphQL this site sends. The package ships
documents for the things whose shape is not negotiable — availability,
quotes, order creation, and everything under `kong.guest` — so you rarely
need to write GraphQL at all.

If you do add a field, add it to the query AND to the TypeScript type in
the same change. A type claiming a field the query does not select is
worse than no type: it turns something the caller would have guarded into
something the compiler promised was safe.

The full contract is published at
`docs/storefront/schema.graphql` in Kong's own repository, and the package
exports typed results for everything it wraps.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
