import { useRef } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useMotion } from '../motion'
import type { Analysis } from '../gs1/analyze'
import type { Verification } from '../gs1/vbg'
import { aiLabel } from '../gs1/aiDictionary'
import { t } from '../i18n'

type Props = { analysis: Analysis; busy: boolean; vbg?: Verification | 'loading'; onTab: (t: string) => void }

/** Riepilogo: dati GS1 validati, chiave riconosciuta e schemi codificabili. */
export function Summary({ analysis, busy, vbg, onTab }: Props) {
  const scope = useRef<HTMLElement>(null)
  const signature = analysis.ais.map((a) => a.ai).join(',')
  useMotion(
    scope,
    (m) => {
      m.from('.ai-item', { y: 12, scale: 0.94, opacity: 0 }, { duration: 0.4, stagger: 0.06, ease: 'back' })
    },
    [signature, Boolean(analysis.error)],
  )
  if (analysis.error) {
    return (
      <section className="card summary error" ref={scope}>
        <AlertTriangle size={22} />
        <div>
          <strong>{analysis.error}</strong>
          {analysis.errorMarkup && <Markup text={analysis.errorMarkup} />}
        </div>
      </section>
    )
  }
  const ok = analysis.results.filter((r) => r.ok).length
  return (
    <section className={busy ? 'card summary busy' : 'card summary'} ref={scope}>
      <div className="summary-head">
        <CheckCircle2 size={22} className="ok-icon" />
        <div>
          <strong>{analysis.key ? analysis.key.name : t('Dati GS1 validi')}</strong>
          <span className="muted"> · {t('validati con il GS1 Barcode Syntax Dictionary')}</span>
        </div>
        {busy && <Loader2 size={18} className="spin" />}
      </div>
      <div className="ai-list">
        {analysis.ais.map((a) => (
          <div key={a.ai} className="ai-item">
            <span className="ai-tag">({a.ai})</span>
            <span className="ai-name">{aiLabel(a.ai)}</span>
            <span className="mono ai-value">{a.value}</span>
          </div>
        ))}
      </div>
      <div className="summary-foot">
        {analysis.rfidNote ? <span className="pill warn">{analysis.rfidNote}</span> : <span className="pill">{t('{ok} schemi EPC su {total} codificabili', { ok, total: analysis.results.length })}</span>}
        {vbg && (
          <button className="pill link" onClick={() => onTab('vbg')}>
            {vbg === 'loading'
              ? t('Verified by GS1: verifica in corso…')
              : vbg.state === 'verified'
                ? `Verified by GS1: ${vbg.name}`
                : vbg.state === 'licensed'
                  ? t('Licenza GS1: {name}', { name: vbg.licensee?.name ?? '—' })
                  : vbg.state === 'invalid'
                    ? t('Verified by GS1: codice non valido')
                    : t('Verified by GS1 non disponibile')}
          </button>
        )}
      </div>
    </section>
  )
}

/** Dato con la parte errata tra barre verticali, come lo restituisce la Syntax Engine. */
function Markup({ text }: { text: string }) {
  const parts = text.split('|')
  return (
    <p className="mono markup">
      {parts.map((p, i) => (i % 2 ? <mark key={i}>{p || ' '}</mark> : <span key={i}>{p}</span>))}
    </p>
  )
}
