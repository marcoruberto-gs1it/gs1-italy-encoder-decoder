import { useState, type ReactNode } from 'react'
import { Binary, Check, Copy } from 'lucide-react'
import { t } from '../i18n'

type CopyProps = {
  /** Testo da copiare, o funzione che lo calcola al clic (es. l'indirizzo corrente). */
  value: string | (() => string)
  label?: string
  icon?: 'bin' | ReactNode
  /** Testo visibile accanto all'icona: il pulsante diventa un pulsante con etichetta. */
  text?: string
}

export function CopyButton({ value, label, icon, text }: CopyProps) {
  const [done, setDone] = useState(false)
  label ??= t('Copia')
  const glyph = done ? <Check size={15} /> : icon === 'bin' ? <Binary size={15} /> : (icon ?? <Copy size={15} />)
  return (
    <button
      type="button"
      className={`${text ? 'copy-btn' : 'icon-btn'} ${done ? 'done' : ''}`}
      aria-label={label}
      title={label}
      onClick={() => {
        const v = typeof value === 'function' ? value() : value
        void navigator.clipboard?.writeText(v).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1400)
        })
      }}
    >
      {glyph}
      {text && <span>{done ? t('Copiato') : text}</span>}
    </button>
  )
}

export function CopyText({ label, value, big, display }: { label: string; value: string; big?: boolean; display?: ReactNode }) {
  return (
    <div className={big ? 'copy-text big' : 'copy-text'}>
      <span className="copy-label">{label}</span>
      <div className="copy-row">
        <code className="mono">{display ?? value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  )
}
