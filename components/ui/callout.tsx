import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A result the guest needs to read: confirmed, refused, gone wrong.
 *
 * `tone` is about MEANING, not colour. `positive` is the accent because
 * on this site the accent is the sun and good news; `notice` is
 * deliberately quiet, because most refusals here are the operator's
 * rules rather than errors — "this cannot be cancelled online" is
 * information, and shouting it in red would misrepresent it.
 */
type Tone = 'positive' | 'notice'

export function Callout({
  tone = 'notice',
  eyebrow,
  title,
  children,
  className,
  role,
}: {
  tone?: Tone
  eyebrow?: ReactNode
  title?: ReactNode
  children?: ReactNode
  className?: string
  role?: 'status' | 'alert'
}) {
  return (
    <div
      role={role}
      className={cn(
        'fade-in border p-6',
        tone === 'positive'
          ? 'border-accent/40 bg-accent/10'
          : 'border-line bg-surface',
        className
      )}
    >
      {eyebrow && (
        <p className={cn('eyebrow', tone === 'positive' ? 'text-accent' : 'text-muted')}>
          {eyebrow}
        </p>
      )}
      {title && <h2 className="mt-2 font-display text-2xl">{title}</h2>}
      {children && <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  )
}
