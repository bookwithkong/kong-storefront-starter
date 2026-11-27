'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { ProductImage } from '@/lib/kong'
import { cn } from '@/lib/cn'

/**
 * Is this `alt` a description, or just the file it was uploaded as?
 *
 * Kong returns whatever is on the media record, and for most operators
 * that is the original filename —
 * `1793670781328_3b524f76-b428-41f3-8a58-cf0e1f9d74ce.jpg`. Passing that
 * through is worse than passing nothing: a screen reader reads the UUID
 * aloud, character by character, and it would print under the photograph
 * as a caption.
 *
 * Two cheap tests catch it. Real alt text contains a space; filenames
 * almost never do. And anything ending in an image extension is a
 * filename whatever else it looks like.
 */
function usableAlt(alt: string | null): string | null {
  if (!alt) return null
  const trimmed = alt.trim()
  if (!trimmed.includes(' ')) return null
  if (/\.(jpe?g|png|webp|gif|avif|heic)$/i.test(trimmed)) return null
  return trimmed
}

/**
 * The photographs, and a way to actually look at one.
 *
 * ## Why this is built rather than installed
 *
 * Radix has no gallery, carousel or lightbox primitive — the catalogue
 * stops at Dialog, Popover, Tabs and friends. But Dialog is the right
 * foundation and is already a dependency, and it brings the parts that
 * are genuinely hard to get right: a focus trap, scroll lock, Escape to
 * close, `aria-modal` wiring, and returning focus to the exact thumbnail
 * the guest opened from. Only the gallery behaviour on top — paging,
 * arrow keys, swipe, preloading — is ours.
 *
 * ## The urls are not refetched, deliberately
 *
 * Kong returns signed urls for private media that expire an hour after
 * the query. These are the same strings the server already rendered into
 * the grid, passed straight through. Re-requesting them on open would
 * mean a second round trip for no new information, and this page is
 * prerendered anyway — see `ProductImage` in `lib/kong.ts` for why the
 * five-minute revalidate is what keeps them fresh.
 */
export function Gallery({ images }: { images: ReadonlyArray<ProductImage> }) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null
  const count = images.length

  /*
    Where focus goes back to. Radix returns focus to whatever opened the
    dialog, which is correct for opening — but a guest who pages from the
    first photograph to the fifth and closes should land on the FIFTH
    thumbnail, not be thrown back to where they started.
  */
  const triggers = useRef<Array<HTMLButtonElement | null>>([])

  const step = useCallback(
    (delta: number) =>
      setIndex(current =>
        current === null ? current : (current + delta + count) % count
      ),
    [count]
  )

  /*
    Preload the two neighbours, so paging is instant rather than a flash
    of empty space. Only the neighbours: preloading the whole set would
    pull several megabytes for a guest who opens one picture.
  */
  useEffect(() => {
    if (index === null) return
    for (const offset of [-1, 1]) {
      const neighbour = images[(index + offset + count) % count]
      if (!neighbour) continue
      const preload = new window.Image()
      preload.src = neighbour.url
    }
  }, [index, images, count])

  /*
    Swipe. A horizontal travel of 50px or more pages; anything less is
    treated as a tap that missed, because a vertical scroll attempt that
    drifts sideways must not change the picture.
  */
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current
    const end = event.changedTouches[0]
    touchStart.current = null
    if (!start || !end) return
    const dx = end.clientX - start.x
    const dy = end.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    step(dx < 0 ? 1 : -1)
  }

  if (count === 0) return null

  const active = index === null ? null : images[index]
  const activeAlt = usableAlt(active?.alt ?? null)

  return (
    <>
      {/*
        Not a uniform grid. The first frame runs wide and the rest sit
        square beside it — a composition rather than a contact sheet.

        The grade is deliberate and slight. Operator-uploaded photographs
        arrive from a dozen phones in a dozen lighting conditions; pulling
        saturation back a touch and lifting contrast a touch makes a mixed
        set cohere without looking filtered.
      */}
      <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.url} className={i === 0 ? 'col-span-2' : undefined}>
            <button
              type="button"
              ref={node => {
                triggers.current[i] = node
              }}
              onClick={() => setIndex(i)}
              aria-label={
                usableAlt(img.alt)
                  ? `View ${usableAlt(img.alt)}`
                  : `View photograph ${i + 1} of ${count}`
              }
              className="group block w-full cursor-zoom-in overflow-hidden rounded-panel shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <img
                src={img.url}
                // Empty when the record only carries a filename: the
                // button's own label already names the photograph, and a
                // UUID read aloud is noise.
                alt={usableAlt(img.alt) ?? ''}
                className={cn(
                  'w-full object-cover saturate-[0.94] contrast-[1.03]',
                  'transition-transform duration-700 ease-out group-hover:scale-[1.03]',
                  i === 0 ? 'aspect-[16/10]' : 'aspect-square'
                )}
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root
        open={open}
        onOpenChange={next => {
          if (next) return
          const closing = index
          setIndex(null)
          // Hand focus to the thumbnail they ended on, after Radix has
          // finished its own restoration.
          if (closing !== null) {
            requestAnimationFrame(() => triggers.current[closing]?.focus())
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fade-in fixed inset-0 z-50 bg-deep/95 backdrop-blur-sm" />
          <Dialog.Content
            onKeyDown={event => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                step(1)
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                step(-1)
              }
            }}
            onTouchStart={event => {
              const touch = event.touches[0]
              touchStart.current = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null
            }}
            onTouchEnd={onTouchEnd}
            /*
              No description, and Radix is told so explicitly rather than
              left to warn about it. The picture is the content; a
              paragraph describing the dialog would be read out before it
              every time.
            */
            aria-describedby={undefined}
            className="fade-in fixed inset-0 z-50 flex flex-col focus:outline-none"
          >
            <Dialog.Title className="sr-only">
              {activeAlt ??
                (index === null
                  ? 'Photograph'
                  : `Photograph ${index + 1} of ${count}`)}
            </Dialog.Title>

            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7">
              <p className="tabular text-[0.8125rem] text-on-deep-muted">
                {index === null ? '' : `${index + 1} / ${count}`}
              </p>
              <Dialog.Close
                aria-label="Close"
                className="rounded-control p-2 text-on-deep-muted transition-colors hover:text-on-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 4l12 12M16 4L4 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Dialog.Close>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-16">
              {count > 1 && (
                <Arrow
                  direction="previous"
                  onClick={() => step(-1)}
                  className="left-1 sm:left-4"
                />
              )}

              {active && (
                /*
                  Keyed on the url so React swaps the element rather than
                  mutating `src` — that is what lets the new photograph
                  fade in instead of tearing halfway through the old one.
                */
                <img
                  key={active.url}
                  src={active.url}
                  alt={activeAlt ?? ''}
                  className="fade-in max-h-full max-w-full rounded-panel object-contain"
                />
              )}

              {count > 1 && (
                <Arrow
                  direction="next"
                  onClick={() => step(1)}
                  className="right-1 sm:right-4"
                />
              )}
            </div>

            <div className="min-h-14 px-5 py-4 text-center sm:px-7">
              {activeAlt && (
                <p className="mx-auto max-w-prose text-[0.8125rem] leading-relaxed text-on-deep-muted">
                  {activeAlt}
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

/**
 * A paging control.
 *
 * `size-11` because this is the one control on the page a guest taps
 * repeatedly, often one-handed — anything under 44px is a miss waiting
 * to happen. It sits ON the photograph on a phone and beside it from
 * `sm` up, which is why it carries its own scrim.
 */
function Arrow({
  direction,
  onClick,
  className,
}: {
  direction: 'previous' | 'next'
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${direction === 'next' ? 'Next' : 'Previous'} photograph`}
      className={cn(
        'absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center',
        'rounded-pill bg-deep/70 text-on-deep backdrop-blur transition-colors duration-200',
        'hover:bg-deep hover:text-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={direction === 'next' ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
