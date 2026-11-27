import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * One definition of what a button looks like here.
 *
 * Before this, the accent style was pasted into ten places and the focus
 * ring into twenty. That is fine until you want to restyle — and
 * restyling is the first thing anyone does with a template, so it is
 * exactly the thing that should take one edit rather than thirty.
 *
 * Variants describe INTENT, not appearance: `primary` is the one action
 * a screen is for, `secondary` is a real alternative, `ghost` is for
 * things that should not compete. Naming them after colours would put
 * you back where you started the first time the palette changes.
 */
type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const BASE =
  // `text-[0.9375rem]`, not `text-sm`. A button is a commitment; 14px made
  // the one action on each screen smaller than the paragraph above it.
  'inline-flex items-center justify-center gap-2 rounded-control text-[0.9375rem] font-medium ' +
  // The same easing the rest of the site uses for motion, rather than the
  // browser default — a button that settles reads as considered, one that
  // snaps reads as a default control.
  'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
  // One focus ring, defined once, so every control is reachable by keyboard
  // in the same way. Losing this on a custom button is how a site becomes
  // unusable without a mouse.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

const VARIANTS: Record<Variant, string> = {
  /*
   * The accent stays the accent. Lifting it on hover with a shadow and a
   * touch of brightness, rather than fading it with `opacity-90`: an
   * element that gets dimmer when you reach for it is the one state
   * change every default button makes, and it reads as nothing happening.
   */
  primary:
    'bg-accent text-accent-foreground shadow-raised ' +
    'hover:brightness-[1.06] hover:shadow-panel active:scale-[0.98] active:brightness-100',
  secondary:
    'border border-line bg-surface shadow-raised hover:border-accent/60 ' +
    'hover:-translate-y-px active:translate-y-0 active:scale-[0.98]',
  ghost: 'text-muted hover:text-accent underline-offset-4 hover:underline',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-2',
  md: 'px-5 py-2.5',
  lg: 'px-7 py-3.5',
}

export interface ButtonStyleProps {
  variant?: Variant
  size?: Size
  /** Fill the container — for the one action at the end of a form. */
  block?: boolean
}

export function buttonClass({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: ButtonStyleProps & { className?: string }) {
  return cn(
    BASE,
    VARIANTS[variant],
    // A ghost button is a link in disguise; padding would misalign it.
    variant === 'ghost' ? '' : SIZES[size],
    block && 'w-full',
    className
  )
}

export function Button({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<'button'> & ButtonStyleProps) {
  return (
    <button
      {...props}
      className={buttonClass({ variant, size, block, className })}
    />
  )
}

/**
 * The same thing, as a link.
 *
 * Separate rather than a polymorphic `as` prop: a button and a link are
 * different elements with different keyboard behaviour and different
 * assistive-technology semantics, and blurring them is how you end up
 * with a "button" that cannot be opened in a new tab.
 */
export function ButtonLink({
  href,
  variant,
  size,
  block,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps & { children: ReactNode }) {
  return (
    <Link
      href={href}
      {...props}
      className={buttonClass({ variant, size, block, className })}
    >
      {children}
    </Link>
  )
}
