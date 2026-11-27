'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Reveal children as they scroll into view.
 *
 * One IntersectionObserver per element, disconnected after it fires —
 * these never need to animate twice, and leaving observers attached to
 * every block on a long page is a slow leak.
 *
 * The hidden state lives in CSS (`.reveal`), not in a style attribute, so
 * the reduced-motion rule in globals.css can switch BOTH the animation
 * and the hidden state off together. A component that hid its content
 * inline would be invisible for anyone who prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  /** Stagger, in ms. Keep it small — this should not feel like a queue. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // No observer: show it. Better a missing flourish than hidden content.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setVisible(true)
          observer.disconnect()
        }
      },
      // Fire a little before the element arrives, so the motion has
      // finished by the time it is properly in view.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-visible={visible || undefined}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn('reveal', className)}
    >
      {children}
    </div>
  )
}
