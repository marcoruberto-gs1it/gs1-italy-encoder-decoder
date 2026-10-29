import { useRef, useState } from 'react'
import { useMotion, gsap } from '../motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Dropdown } from './Dropdown'
import type { SchemeResult, Segment } from '../gs1/epc'
import { KIND_INFO, kindOf } from '../gs1/schemes'
import { segmentColors } from '../colors'
import { t } from '../i18n'

/** Menu a tendina del tipo di tag (schema EPC), con lo stato di ciascuno. */
export function SchemeSelect({ schemes, results, scheme, onScheme, id }: { schemes: string[]; results: SchemeResult[]; scheme: string | null; onScheme: (s: string) => void; id?: string }) {
  const current = results.find((r) => r.scheme === scheme)
  return (
    <div className="scheme-select">
      <Dropdown
        id={id}
        value={scheme ?? ''}
        onChange={onScheme}
        options={schemes.map((s) => {
          const r = results.find((x) => x.scheme === s)
          const kind = kindOf(s)
          return {
            value: s,
            label: s,
            detail:
              r && !r.ok
                ? t('Non applicabile a questi dati')
                : r
                  ? `${r.length} bit${r.dropped.length ? ` · ${t('senza {ais}', { ais: r.dropped.map((a) => `(${a.ai})`).join(' ') })}` : ''}${kind === 'plusplus' ? ` · ${t('con dominio')}` : ''}`
                  : undefined,
            muted: Boolean(r && !r.ok),
            aside: <span className={`kind kind-${kind}`}>{KIND_INFO[kind].label}</span>,
          }
        })}
      />
      {scheme && (
        <p className={`scheme-status ${current && !current.ok ? 'bad' : ''}`}>
          {current && !current.ok ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          <span className={`kind kind-${kindOf(scheme)}`}>{KIND_INFO[kindOf(scheme)].label}</span>
          {current && !current.ok ? current.error : KIND_INFO[kindOf(scheme)].text}
        </p>
      )}
    </div>
  )
}

/** Barra proporzionale dei campi + schede con valore, bit e spiegazione di ogni campo. */
export function BitMap({ result }: { result: Extract<SchemeResult, { ok: true }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const scope = useRef<HTMLDivElement>(null)
  const colors = segmentColors(result.segments)
  const total = result.bits.length

  // I campi entrano nella barra uno dopo l'altro, nell'ordine in cui il tag li memorizza.
  useMotion(
    scope,
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.bitbar-seg', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.45, stagger: 0.07 })
        .from('.seg-card', { y: 16, opacity: 0, duration: 0.4, stagger: 0.05 }, '-=0.35')
    },
    [result.scheme, result.hex],
  )

  return (
    <div className="bitmap" ref={scope}>
      <div className="bitbar" role="img" aria-label={t('{bits} bit suddivisi in {n} campi', { bits: total, n: result.segments.length })}>
        {result.segments.map((s, i) => (
          <div
            key={i}
            className={`bitbar-seg ${hover === i ? 'hl' : ''} ${s.kind === 'padding' ? 'pad' : ''}`}
            style={{ flexGrow: s.bits.length, background: colors[i] }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${s.label}: ${s.bits.length} bit`}
          >
            {s.bits.length / total > 0.06 && <span>{s.bits.length}</span>}
          </div>
        ))}
      </div>
      <div className="bitbar-scale mono">
        <span>bit 0</span>
        <span>{t('{bits} bit = {words} parole da 16 bit', { bits: total, words: total / 16 })}</span>
      </div>

      <ol className="seg-list">
        {result.segments.map((s, i) => (
          <SegmentCard key={i} seg={s} color={colors[i]} active={hover === i} onHover={(on) => setHover(on ? i : null)} />
        ))}
      </ol>
    </div>
  )
}

function SegmentCard({ seg, color, active, onHover }: { seg: Segment; color: string; active: boolean; onHover: (on: boolean) => void }) {
  return (
    <li className={`seg-card ${active ? 'hl' : ''} ${seg.plus ? 'plus' : ''}`} style={{ ['--seg' as string]: color }} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <div className="seg-head">
        <span className="seg-swatch" />
        <strong>{seg.label}</strong>
        {seg.plus && <span className="kind kind-plus">+AIDC</span>}
        <span className="seg-range mono">
          bit {seg.start}–{seg.start + seg.bits.length - 1} · {seg.bits.length} bit
        </span>
      </div>
      {seg.value !== undefined && seg.value !== '' && (
        <div className="seg-value">
          <span className="mono">{seg.value}</span>
          <span className="arrow">→</span>
        </div>
      )}
      <div className="seg-bits mono">
        {seg.parts ? (
          seg.parts.map((p, k) => (
            <span key={k} className="part" title={p.note}>
              <span className="part-bits">{p.bits}</span>
              <span className="part-label">{p.label}</span>
              {p.note && <span className="part-note">{p.note}</span>}
            </span>
          ))
        ) : (
          <span className="part">
            <span className="part-bits">{seg.bits}</span>
          </span>
        )}
      </div>
      {seg.note && <p className="seg-note">{seg.note}</p>}
    </li>
  )
}
