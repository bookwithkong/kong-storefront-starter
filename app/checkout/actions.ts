'use server'

import { kong } from '@/lib/kong'
import { setGuestToken } from '@/lib/guest-session'

/**
 * Where this site lives, for the post-payment return.
 *
 * Explicit rather than derived from the incoming request: the value has
 * to match a declared origin exactly, and a host header is both
 * spoofable and wrong behind a proxy.
 */
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(/\/+$/, '')

/**
 * Create the order on the SERVER.
 *
 * Deliberately not from the browser. Order creation is the one call that
 * writes, it carries the guest's name, email and phone, and it is the
 * step you will later want to put a rate limit, a bot check or a payment
 * intent in front of. None of that is possible in a bundle the guest can
 * read and edit.
 *
 * It also sidesteps CORS entirely: a server sends no Origin header, so
 * this works without declaring anything with Kong — unlike the
 * availability and price calls the panel makes from the browser.
 */
export interface TypedValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequests: string
}

export type CheckoutState =
  | { status: 'idle' }
  | { status: 'error'; message: string; values: TypedValues }
  | {
      status: 'booked'
      orderReference: string
      bookingReference: string
      requiresApproval: boolean
      organizationName: string
    }

interface Selection {
  productCode: string
  organizationSlug: string
  optionId: string
  startTimeUtc: string
  endTimeUtc: string
  durationMinutes?: number | null
  pricingSelections: Array<{ pricingTierId: string; quantity: number }>
  addOnSelections?: Array<{ addOnId: string; quantity: number }> | null
}

export async function createBooking(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const values: TypedValues = {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    specialRequests: String(formData.get('specialRequests') ?? ''),
  }

  const raw = formData.get('selection')
  if (typeof raw !== 'string') {
    return { status: 'error', message: 'Your selection was lost. Please pick a departure again.', values }
  }

  let selection: Selection
  try {
    selection = JSON.parse(raw) as Selection
  } catch {
    return { status: 'error', message: 'Your selection could not be read. Please pick a departure again.', values }
  }

  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const specialRequests = String(formData.get('specialRequests') ?? '').trim()

  if (!firstName || !lastName || !email) {
    return { status: 'error', message: 'Please give us a name and an email address.', values }
  }

  try {
    const result = (await kong.createOrder(
      {
        organizationSlug: selection.organizationSlug,
        bookerDetails: {
          firstName,
          lastName,
          email,
          ...(phone ? { phone } : {}),
        },
        booking: {
          productCode: selection.productCode,
          optionId: selection.optionId,
          startDateTime: selection.startTimeUtc,
          endDateTime: selection.endTimeUtc,
          ...(selection.durationMinutes != null
            ? { durationMinutes: selection.durationMinutes }
            : {}),
          pricingItems: selection.pricingSelections.map(p => ({
            pricingTierId: p.pricingTierId,
            quantity: p.quantity,
          })),
          ...(selection.addOnSelections?.length
            ? {
                addOns: selection.addOnSelections.map(a => ({
                  addOnId: a.addOnId,
                  quantity: a.quantity,
                })),
              }
            : {}),
          ...(specialRequests ? { specialRequests } : {}),
        },
        /*
          Bring the guest back HERE after they pay.

          Without it they finish on Kong's manage page, on a Kong domain —
          which is a strange place to land after booking on this site.

          The ORIGIN must be declared for the organization in Kong under
          Website -> Custom site, the same list that authorises browser
          calls. An undeclared one fails the booking rather than being
          ignored, so this is deliberately absent when unset rather than
          guessed from a request header.
        */
        ...(SITE_ORIGIN ? { returnUrl: `${SITE_ORIGIN}/manage` } : {}),

        /*
         * No `surface` is sent.
         *
         * BookingSurface has exactly two values — EMBEDDED_WIDGET (the
         * Kong embed) and WEBSITE (the Kong-HOSTED storefront). A site
         * you built yourself with this package is neither, and sending
         * either one would file the booking under a surface it did not
         * come from. Omitting it leaves the field honest rather than
         * wrong; ask Kong for a value that fits if you need to attribute
         * these bookings.
         */
      },
      /*
       * An idempotency key, derived from the booking itself.
       *
       * A guest who double-submits, or whose connection drops after the
       * order was created but before the response arrived, must not end
       * up with two bookings. The same selection and the same guest
       * produce the same key, so Kong replays the first answer instead
       * of creating a second order.
       */
      {
        idempotencyKey: `${selection.productCode}:${selection.startTimeUtc}:${email}:${selection.pricingSelections
          .map(p => `${p.pricingTierId}x${p.quantity}`)
          .join(',')}`,
      }
    )) as {
      guestToken?: string
      order?: {
        orderReference?: string
        bookingReference?: string
        requiresApproval?: boolean
        organizationName?: string
      }
    }

    /*
      Sign the guest in, right here.

      createOrder mints a guest session, and keeping it means the booking
      is theirs to see and change immediately — and, crucially, that a
      guest returning from the payment processor arrives already signed
      in. That is why nothing has to be appended to `returnUrl`: the
      credential never travels in a URL, where it would sit in browser
      history and leak through Referer headers.
    */
    if (result?.guestToken) await setGuestToken(result.guestToken)

    const order = result?.order
    if (!order?.orderReference) {
      return { status: 'error', message: 'The booking did not come back with a reference. Please contact us before trying again.', values }
    }

    return {
      status: 'booked',
      orderReference: order.orderReference,
      bookingReference: order.bookingReference ?? order.orderReference,
      requiresApproval: Boolean(order.requiresApproval),
      organizationName: order.organizationName ?? '',
    }
  } catch (error) {
    // Surface Kong's own message — it explains capacity, cutoffs and
    // price mismatches far better than a generic failure would.
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Something went wrong creating your booking.',
      values,
    }
  }
}
