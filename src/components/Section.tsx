import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
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

/** Sezione richiudibile: i dettagli restano fuori dalla vista finché non servono. */
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
    <section className={`section ${open ? 'open' : ''}`} id={`sec-${id}`}>
      <h2 className="section-h">
        <button type="button" className="section-head" aria-expanded={open} aria-controls={`sec-body-${id}`} onClick={toggle}>
          <span className={`tile tile-${tone}`} aria-hidden>
            {icon}
          </span>
          <span className="section-title">{title}</span>
          <span className="section-summary">{summary}</span>
          <ChevronDown size={18} className="section-chev" aria-hidden />
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
