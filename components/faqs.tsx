'use client'

import * as Accordion from '@radix-ui/react-accordion'

export interface Faq {
  question: string
  answer: string
}

/**
 * Radix handles the hard parts: one open at a time, arrow-key roving,
 * the right aria wiring, and the height variable the CSS animates
 * against. The height of an opening panel is not knowable in CSS alone,
 * which is why `--radix-accordion-content-height` exists.
 */
export function Faqs({ items }: { items: ReadonlyArray<Faq> }) {
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="font-display text-2xl">Good to know</h2>
      <Accordion.Root type="single" collapsible className="mt-5">
        {items.map((faq, i) => (
          <Accordion.Item
            key={i}
            value={`faq-${i}`}
            className="border-b border-line"
          >
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-left text-[0.9375rem] font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                {faq.question}
                <span
                  aria-hidden
                  className="shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-45"
                >
                  {/* A plus that becomes an ex. One glyph, two states. */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:acc-close data-[state=open]:acc-open">
              <p className="pb-5 pr-10 text-[0.9375rem] leading-relaxed text-muted">
                {faq.answer}
              </p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  )
}
