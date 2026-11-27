import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A labelled form control.
 *
 * The label WRAPS the input rather than pointing at it with `htmlFor`,
 * so the two cannot drift apart and no id has to be invented. Clicking
 * the label still focuses the control, which is the behaviour that
 * matters.
 */
/*
 * Roomier than a dense admin form on purpose.
 *
 * This is the last screen before somebody spends money on an evening out,
 * and a cramped control reads as an afterthought. The focus state is a
 * border colour AND a ring, so it is unmistakable without being loud.
 */
const CONTROL =
  'mt-2.5 w-full rounded-control border border-line bg-background px-4 py-3 text-base ' +
  'transition-[border-color,box-shadow] duration-200 placeholder:text-muted/50 ' +
  'hover:border-muted/40 ' +
  'focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_18%,transparent)] ' +
  'focus:outline-none'

/*
 * Sentence case, not an uppercase eyebrow.
 *
 * "ANYTHING WE SHOULD KNOW? (OPTIONAL)" in tracked-out capitals wrapped
 * onto two shouting lines and looked like a warning. Labels on a form
 * someone is filling in should read like a person asking.
 */
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-foreground/90">{children}</span>
  )
}

/*
 * `className` styles the LABEL, not the input.
 *
 * It is the label that is the grid child, so layout utilities —
 * `sm:col-span-2` and friends — have to land there. They were being
 * applied to the <input> instead, which silently did nothing: the email
 * and phone fields were meant to span the form and sat half-width for
 * three commits without anyone noticing.
 *
 * Reach the control itself with `inputClassName` on the rare occasion
 * you need to.
 */
export function Field({
  label,
  hint,
  className,
  inputClassName,
  ...props
}: ComponentProps<'input'> & {
  label: ReactNode
  hint?: ReactNode
  inputClassName?: string
}) {
  return (
    <label className={cn('block', className)}>
      <Label>{label}</Label>
      <input {...props} className={cn(CONTROL, inputClassName)} />
      {hint && (
        <span className="mt-1.5 block text-[0.8125rem] text-muted">{hint}</span>
      )}
    </label>
  )
}

export function TextareaField({
  label,
  className,
  inputClassName,
  ...props
}: ComponentProps<'textarea'> & {
  label: ReactNode
  inputClassName?: string
}) {
  return (
    <label className={cn('block', className)}>
      <Label>{label}</Label>
      <textarea {...props} className={cn(CONTROL, 'resize-y', inputClassName)} />
    </label>
  )
}

export function SelectField({
  label,
  className,
  inputClassName,
  children,
  ...props
}: ComponentProps<'select'> & {
  label: ReactNode
  inputClassName?: string
}) {
  return (
    <label className={cn('block', className)}>
      <Label>{label}</Label>
      <select {...props} className={cn(CONTROL, inputClassName)}>
        {children}
      </select>
    </label>
  )
}
