export interface ItineraryItem {
  itemName: string
  description: string | null
  durationMinutes: number | null
  location: string | null
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

/**
 * The itinerary as a timeline.
 *
 * The numbering here is not decoration — an itinerary IS an ordered
 * sequence, and the durations are real data Kong returns. A step with no
 * duration simply omits it rather than rendering a zero, because null
 * means "the operator did not say", not "no time at all".
 */
export function Itinerary({
  items,
  // Neutral by default. "How the evening runs" reads beautifully on a
  // sunset cruise and is simply wrong on a morning charter — a heading
  // hardcoded to one product's time of day will be wrong for the next
  // product the operator adds.
  title = 'How it runs',
}: {
  items: ReadonlyArray<ItineraryItem>
  title?: string
}) {
  if (items.length === 0) return null

  const total = items.reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0)

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl">{title}</h2>
        {total > 0 && (
          <span className="tabular text-sm text-muted">
            about {duration(total)}
          </span>
        )}
      </div>

      <ol className="mt-6">
        {items.map((item, i) => (
          <li key={i} className="relative flex gap-5 pb-7 last:pb-0">
            {/*
              The connector stops at the last item, so the line reads as
              joining steps rather than trailing off the end.
            */}
            {i < items.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[0.9375rem] top-8 bottom-0 w-px bg-line"
              />
            )}
            <span
              aria-hidden
              className="tabular relative z-10 flex size-[1.875rem] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-xs font-semibold text-accent"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-medium">{item.itemName}</h3>
                {item.durationMinutes != null && (
                  <span className="tabular text-xs text-muted">
                    {duration(item.durationMinutes)}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              )}
              {item.location && (
                <p className="mt-1 text-xs text-muted">{item.location}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
