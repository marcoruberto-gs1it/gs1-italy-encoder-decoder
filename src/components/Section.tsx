import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { collapse, expand } from '../motion'

export type Tone = 'blue' | 'teal' | 'forest' | 'orange'

type Props = {
  id: string
  /** Colore GS1 della categoria: blu dati GS1, teal RFID, forest web e barcode. */
  tone?: Tone
  icon: ReactNode
  title: string
  /** Riassunto di una riga, visibile anche a sezione chiusa. */
  summary: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}

/** Sezione richiudibile (voce di accordion nello stile shadcn/ui): i dettagli restano fuori dalla vista finché non servono. */
export function Section({ id, tone = 'blue', icon, title, summary, open, onToggle, children }: Props) {
  const body = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const closing = useRef(false)

  useLayoutEffect(() => {
    if (mounted.current && open) expand(body.current)
    mounted.current = true
  }, [open])

  // Un secondo clic mentre la sezione si chiude non la riapre.
  const toggle = () => {
    if (closing.current) return
    if (!open) return onToggle()
    closing.current = true
    collapse(body.current, () => {
      closing.current = false
      onToggle()
    })
  }

  return (
    <section className={cn('section border-b last:border-b-0', open && 'open')} id={`sec-${id}`}>
      <h2 className="m-0">
        <button
          type="button"
          className="group grid w-full cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3.5 px-6 py-4 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset phone:grid-cols-[auto_minmax(0,1fr)_auto] phone:px-4 phone:py-3.5"
          aria-expanded={open}
          aria-controls={`sec-body-${id}`}
          onClick={toggle}
        >
          <span className={`tile tile-${tone}`} aria-hidden>
            {icon}
          </span>
          <span className="text-base font-bold whitespace-nowrap text-primary">{title}</span>
          <span className="truncate text-sm text-muted-foreground phone:hidden">{summary}</span>
          <ChevronDown className="size-[18px] text-muted-foreground transition-transform duration-300 group-aria-expanded:rotate-180" aria-hidden />
        </button>
      </h2>
      {open && (
        <div className="section-body" id={`sec-body-${id}`} ref={body}>
          <div className="section-inner">{children}</div>
        </div>
      )}
    </section>
  )
}

/** Gruppo di sezioni in una Card, con un titolo facoltativo. */
export function Sections({ title, note, className, children }: { title?: string; note?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('sections overflow-hidden rounded-3xl bg-card shadow-card', className)}>
      {title && (
        <div className="border-b px-6 pt-4 pb-3 phone:px-4">
          <h2 className="text-base font-bold text-primary">{title}</h2>
          {note && <p className="mt-0.5 text-sm text-muted-foreground">{note}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
