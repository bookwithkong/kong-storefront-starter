import { Fragment } from 'react'

/**
 * Kong returns operator-written copy with light markdown in it — `**bold**`
 * runs and `-` bullets — because that is what the operator typed into the
 * editor.
 *
 * This renders those two things and nothing else. It is deliberately not a
 * markdown library: the input is one operator's own description field, the
 * output is a handful of elements, and pulling in a parser to read two
 * constructs would be the larger risk. If your operators write richer copy,
 * swap this for `react-markdown` — the shape of the component stays the same.
 *
 * Note there is no `dangerouslySetInnerHTML` anywhere here. The text is
 * split and rendered as React children, so an operator cannot inject markup
 * into your site by typing it into a product description.
 */
function Italic({ text }: { text: string }) {
  // Single asterisks, after the double ones have already been consumed.
  const parts = text.split(/\*(.+?)\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <em key={i}>{part}</em>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

/**
 * `**bold**` first, then `*italic*` inside each remaining run.
 *
 * Order matters: a single-asterisk pass run first would match the inner
 * halves of `**bold**` and leave stray asterisks behind. Splitting on the
 * double form first means the italic pass only ever sees text that has
 * none left.
 */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        // Odd indices are the captured groups, i.e. what was between the
        // asterisks.
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <Italic key={i} text={part} />
        )
      )}
    </>
  )
}

export function Prose({ text }: { text: string }) {
  // Group consecutive `-` lines into one list; everything else is a
  // paragraph. Blank lines separate blocks.
  const blocks: Array<{ kind: 'p' | 'ul'; lines: string[] }> = []

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const isBullet = line.startsWith('- ')
    const last = blocks[blocks.length - 1]

    if (isBullet) {
      if (last?.kind === 'ul') last.lines.push(line.slice(2))
      else blocks.push({ kind: 'ul', lines: [line.slice(2)] })
    } else {
      blocks.push({ kind: 'p', lines: [line] })
    }
  }

  return (
    <div className="space-y-4 text-[0.9375rem] leading-relaxed text-muted">
      {blocks.map((block, i) =>
        block.kind === 'ul' ? (
          <ul key={i} className="space-y-2">
            {block.lines.map((line, j) => (
              <li key={j} className="flex gap-3">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                <span><Rich text={line} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Rich text={block.lines[0]} />
          </p>
        )
      )}
    </div>
  )
}
