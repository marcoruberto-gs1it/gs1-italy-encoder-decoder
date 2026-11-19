import * as React from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground/70 hover:border-ring/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-muted read-only:hover:border-input aria-invalid:border-destructive aria-invalid:ring-destructive/15 md:text-sm'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(field, 'h-11 py-1', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(field, 'field-sizing-content min-h-24 resize-y py-2.5', className)} {...props} />
}

export { Input, Textarea }
