import { useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { t } from '../i18n'

export type DropdownOption = {
  value: string
  label: string
  /** Riga secondaria sotto l'etichetta. */
  detail?: string
  /** Elemento a destra (es. tipo di schema o numero di bit). */
  aside?: ReactNode
  /** Opzione mostrata ma segnalata come non utilizzabile (resta selezionabile per vederne il motivo). */
  muted?: boolean
}

type Props = {
  id?: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  /** Testo mostrato nel pulsante al posto dell'etichetta dell'opzione scelta. */
  display?: ReactNode
  ariaLabel?: string
  className?: string
}

/** Oltre questo numero di voci il menu ha anche la ricerca. */
const SEARCH_FROM = 9

/** Menu a tendina (combobox shadcn/ui: Popover + Command), con tastiera e ricerca sulle liste lunghe. */
export function Dropdown({ id, value, options, onChange, placeholder, display, ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const searchable = options.length >= SEARCH_FROM

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            'dd-trigger flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs transition-[color,box-shadow,border-color] outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/25',
            className,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !selected && !display && 'text-muted-foreground')}>{display ?? selected?.label ?? placeholder ?? t('Seleziona…')}</span>
          {selected?.aside && !display && <span className="shrink-0">{selected.aside}</span>}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-[min(300px,calc(100vw-16px))] p-0">
        <Command loop defaultValue={selected ? key(selected) : undefined}>
          {searchable && <CommandInput placeholder={t('Cerca…')} />}
          <CommandList>
            <CommandEmpty>{t('Nessun risultato')}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={key(o)}
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  data-checked={o.value === value || undefined}
                >
                  <Check className={cn('mt-0.5 size-4 text-primary', o.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('font-medium', o.muted && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{o.label}</span>
                    {o.detail && <span className="text-xs text-muted-foreground">{o.detail}</span>}
                  </span>
                  {o.aside && <span className="shrink-0">{o.aside}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Valore per la ricerca di cmdk: unico e con etichetta e dettaglio, così si cerca anche per descrizione. */
const key = (o: DropdownOption) => `${o.value} ${o.label} ${o.detail ?? ''}`
