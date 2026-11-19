import { useState, type ReactNode } from 'react'
import { Binary, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { t } from '../i18n'
import { LottieIcon } from './LottieIcon'

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
  const glyph = done ? <LottieIcon name="tick" size={16} className="lottie-current" fallback={<Check />} /> : icon === 'bin' ? <Binary /> : (icon ?? <Copy />)
  return (
    <Tooltip content={done ? t('Copiato') : label}>
      <Button
        variant={text ? 'outline' : 'ghost'}
        size={text ? 'sm' : 'icon-sm'}
        className={cn(text && 'font-mono text-xs', done && 'border-success/40 text-success hover:text-success', !text && 'text-muted-foreground')}
        aria-label={done ? t('Copiato') : label}
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
      </Button>
    </Tooltip>
  )
}

export function CopyText({ label, value, big, display }: { label: string; value: string; big?: boolean; display?: ReactNode }) {
  return (
    <div className={big ? 'copy-text big' : 'copy-text'}>
      <span className="copy-label">{label}</span>
      <div className="flex items-center gap-1 rounded-md border bg-muted/50 py-1 pr-1 pl-3">
        <code className="mono min-w-0 flex-1 text-[13px] break-all">{display ?? value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  )
}
