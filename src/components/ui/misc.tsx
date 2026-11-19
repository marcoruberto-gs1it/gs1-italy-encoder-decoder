import * as React from 'react'
import { Label as LabelPrimitive, Separator as SeparatorPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cn('flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50', className)} {...props} />
}

function Separator({ className, orientation = 'horizontal', decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root data-slot="separator" decorative={decorative} orientation={orientation} className={cn('shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', className)} {...props} />
}

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd data-slot="kbd" className={cn('pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-muted px-1 font-mono text-[11px] font-medium text-muted-foreground select-none', className)} {...props} />
}

const TooltipProvider = ({ delayDuration = 300, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />

/** Suggerimento al passaggio o al focus. Il nome accessibile resta sul controllo (aria-label). */
function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactElement; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-primary px-2.5 py-1.5 text-xs text-balance text-primary-foreground fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg,>.alert-icon]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg,>.alert-icon]:gap-x-3 [&>svg]:size-5 [&>svg]:translate-y-px [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        info: 'border-[#cfdcef] bg-[#f3f7fc] text-primary',
        warning: 'border-[#f9c4ad] bg-[#fef6f1] text-warning',
        destructive: 'border-[#f3b5c0] bg-[#fdf3f5] text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('col-start-2 min-h-4 font-semibold tracking-tight', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('col-start-2 grid justify-items-start gap-1 text-sm opacity-90 [&_p]:leading-relaxed', className)} {...props} />
}

export { Label, Separator, Kbd, TooltipProvider, Tooltip, Alert, AlertTitle, AlertDescription }
