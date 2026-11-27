'use client'

import type { ReactNode } from 'react'

/**
 * An action bar pinned to the bottom of the viewport.
 *
 * For a long list of choices where the confirm button would otherwise sit
 * below all of them. The reschedule page offers up to forty departures;
 * before this, choosing the first one and then hunting for a button four
 * screens down was the whole flow.
 *
 * It only appears once there is something to confirm, so an undecided
 * guest gets the full screen and no permanently parked furniture.
 *
 * `pb-[env(safe-area-inset-bottom)]` keeps it clear of the home
 * indicator on an iPhone, where a bar flush to the bottom edge is partly
 * unreachable.
 */
export function StickyBar({
  show,
  children,
}: {
  show: boolean
  children: ReactNode
}) {
  if (!show) return null

  return (
    <div className="slide-up pointer-events-none fixed inset-x-0 bottom-0 z-40">
      {/*
        A gradient above the bar rather than a hard edge, so content
        scrolling underneath fades out instead of being chopped off.
      */}
      <div
        aria-hidden
        className="h-16 bg-gradient-to-t from-background to-transparent"
      />
      <div className="pointer-events-auto border-t border-line bg-surface/95 backdrop-blur">
        {/*
          `pr-20` on small screens, not `px-6` all round. The operator's
          chat assistant is a fixed bubble in the bottom-right corner, and
          without this the bar's own action sits underneath it — the one
          button on the bar becomes the one button you cannot press.
        */}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 py-4 pl-6 pr-20 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pr-6">
          {children}
        </div>
      </div>
    </div>
  )
}
