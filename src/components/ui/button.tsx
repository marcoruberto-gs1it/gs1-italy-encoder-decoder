import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-card hover:bg-[#0a3c82]',
        brand: 'bg-brand font-bold text-brand-foreground shadow-cta hover:bg-[#e4552a] active:translate-y-px',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline: 'border border-border bg-card shadow-xs hover:border-primary/30 hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto! px-0! text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: 'h-7 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5',
        sm: 'h-8 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5',
        lg: 'h-11 rounded-2xl px-6 text-[15px] has-[>svg]:px-5',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-lg',
        'icon-xs': 'size-7 rounded-md',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({ className, variant, size, asChild = false, type, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
