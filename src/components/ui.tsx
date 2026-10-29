import { useState, type ReactNode } from 'react'
import { Binary, Check, Copy } from 'lucide-react'
import { t } from '../i18n'

export function CopyButton({ value, label, icon }: { value: string; label?: string; icon?: 'bin' }) {
  const [done, setDone] = useState(false)
  label ??= t('Copia')
  return (
    <button
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        })
      }}
    >
      {done ? <Check size={16} /> : icon === 'bin' ? <Binary size={16} /> : <Copy size={16} />}
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
