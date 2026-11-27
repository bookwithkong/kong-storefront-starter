import { money } from '@/lib/kong'
import { cn } from '@/lib/cn'

/**
 * One way to draw a price, everywhere.
 *
 * Before this the same idea was rendered two different ways: the booking
 * panel set it in Fraunces at `text-3xl` with a 12px "from" tucked beside
 * it, and the catalogue card set it in IBM Plex at `text-xl` semibold
 * with a 14px one. Nothing was wrong with either, which is the problem —
 * a price that changes voice between two screens reads as two different
 * shops.
 *
 * The lockup: "FROM" as a tracked eyebrow ABOVE the figure rather than
 * crowding its baseline, the number in the display face with tabular
 * figures so columns of prices line up, and any qualifier trailing in
 * muted sans where it cannot compete with the amount.
 *
 * `suppressPriceDisplay` is NOT handled here. That flag is the operator
 * saying "do not show this guest a price at all", which is a decision
 * about whether to render the component, not about how it looks — and
 * burying it in a presentational component is how it eventually gets
 * missed on a surface that forgets to ask.
 */
export function Price({
  cents,
  /** The eyebrow above the figure. Pass `null` for an exact price. */
  label = 'From',
  /** Trails the amount, e.g. "per guest". */
  qualifier,
  size = 'md',
  className,
}: {
  cents: number | null | undefined
  label?: string | null
  qualifier?: string | null
  /**
   * `sm` sets the label on the SAME baseline as the figure rather than
   * above it. Same lockup, folded flat for somewhere short and wide —
   * the mobile action bar, where a stacked eyebrow would make a 56px bar
   * nearer 80px and eat the viewport it is trying to stay out of.
   */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const formatted = money(cents)
  if (formatted == null) return null

  const inline = size === 'sm'

  return (
    <p className={cn('min-w-0', inline && 'flex items-baseline gap-2', className)}>
      {label && (
        <span className={cn('eyebrow text-muted', inline ? 'shrink-0' : 'block')}>
          {label}
        </span>
      )}
      <span
        className={cn(
          'flex flex-wrap items-baseline gap-x-2',
          label && !inline && 'mt-1.5'
        )}
      >
        <span
          className={cn(
            'tabular font-display leading-none tracking-tight',
            size === 'lg'
              ? 'text-[2.125rem]'
              : size === 'md'
                ? 'text-[1.75rem]'
                : 'text-[1.375rem]'
          )}
        >
          {formatted}
        </span>
        {qualifier && (
          <span className="text-[0.8125rem] text-muted">{qualifier}</span>
        )}
      </span>
    </p>
  )
}
