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
const CONTROL =
  'mt-2 w-full border border-line bg-background px-3 py-2.5 text-sm ' +
  'transition-colors duration-200 placeholder:text-muted/60 ' +
  'hover:border-line/80 focus:border-accent/60 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Label({ children }: { children: ReactNode }) {
  return <span className="eyebrow text-muted">{children}</span>
}

export function Field({
  label,
  hint,
  className,
  ...props
}: ComponentProps<'input'> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input {...props} className={cn(CONTROL, className)} />
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function TextareaField({
  label,
  className,
  ...props
}: ComponentProps<'textarea'> & { label: ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea {...props} className={cn(CONTROL, 'resize-y', className)} />
    </label>
  )
}

export function SelectField({
  label,
  className,
  children,
  ...props
}: ComponentProps<'select'> & { label: ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select {...props} className={cn(CONTROL, className)}>
        {children}
      </select>
    </label>
  )
}
