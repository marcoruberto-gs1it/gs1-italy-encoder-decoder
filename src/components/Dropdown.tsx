import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { animateIn } from '../motion'
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
}

/** Menu a tendina nello stile dell'app (la lista di un <select> nativo non si può personalizzare). */
export function Dropdown({ id, value, options, onChange, placeholder, display, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)
  const [place, setPlace] = useState<CSSProperties>({})

  // La lista sta in un portale sopra tutta la pagina: le sezioni animate (con transform) non possono coprirla.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      const gap = 6
      const below = window.innerHeight - r.bottom - gap - 12
      const above = r.top - gap - 12
      const up = below < 240 && above > below
      const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16)
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
      setPlace({
        position: 'fixed',
        left,
        width,
        maxHeight: Math.max(160, Math.min(360, up ? above : below)),
        ...(up ? { bottom: window.innerHeight - r.top + gap, transformOrigin: '50% 100%' } : { top: r.bottom + gap, transformOrigin: '50% 0%' }),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (!root.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    if (list.current) animateIn(list.current, { opacity: 0, scale: 0.97 }, { duration: 0.18 })
    const sel = list.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (sel && list.current) list.current.scrollTop = sel.offsetTop - list.current.clientHeight / 2 + sel.offsetHeight / 2
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const openAt = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const choose = (i: number) => {
    const o = options[i]
    if (!o) return
    onChange(o.value)
    setOpen(false)
  }
  const move = (to: number) => {
    const i = Math.min(options.length - 1, Math.max(0, to))
    setActive(i)
    // Scorre solo la lista, mai la pagina.
    const el = list.current?.children[i] as HTMLElement | undefined
    const l = list.current
    if (el && l) {
      if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop - 6
      else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight + 6
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openAt()
      }
      return
    }
    if (e.key === 'ArrowDown') move(active + 1)
    else if (e.key === 'ArrowUp') move(active - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape' || e.key === 'Tab') return setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div className={`dropdown ${open ? 'open' : ''}`} ref={root}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="dd-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={onKey}
      >
        <span className={`dd-value ${selected ? '' : 'placeholder'}`}>{display ?? selected?.label ?? placeholder ?? t('Seleziona…')}</span>
        {selected?.aside && !display && <span className="dd-aside">{selected.aside}</span>}
        <ChevronDown size={18} className="dd-chev" />
      </button>
      {open &&
        createPortal(
        <ul className="dd-list" role="listbox" id={listId} ref={list} style={place}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`dd-option ${i === active ? 'active' : ''} ${o.muted ? 'muted' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              <span className="dd-check">{o.value === value && <Check size={16} />}</span>
              <span className="dd-text">
                <span className="dd-label">{o.label}</span>
                {o.detail && <span className="dd-detail">{o.detail}</span>}
              </span>
              {o.aside && <span className="dd-aside">{o.aside}</span>}
            </li>
          ))}
        </ul>,
          document.body,
        )}
    </div>
  )
}
