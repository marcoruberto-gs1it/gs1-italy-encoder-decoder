import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AlertOctagon, AlertTriangle, ArrowRight, BadgeCheck, Binary, CheckCircle2, Filter, Fingerprint, Layers, Link2, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { DigitalLinkIcon, KeyDataIcon, RfidTagIcon } from './Art'
import type { Analysis } from '../gs1/analyze'
import type { SchemeResult } from '../gs1/epc'
import type { Verification } from '../gs1/vbg'
import { KIND_INFO, filterMeaning, familyOf } from '../gs1/schemes'
import { segmentColors } from '../colors'
import type { Issue, IssueAction } from '../issues'
import { alertIn, rollIn, waveIn } from '../motion'
import { CopyButton } from './ui'
import { t } from '../i18n'

type Ok = Extract<SchemeResult, { ok: true }>

type Props = {
  analysis: Analysis
  scheme: string | null
  busy: boolean
  vbg?: Verification | 'loading'
  issues: Issue[]
  onTab: (tab: string) => void
  onAction: (a: IssueAction) => void
}

/**
 * Riepilogo dell'EPC: stato, esadecimale con i bit colorati per campo, pochi valori chiave e le
 * rappresentazioni da copiare. Sopra, le segnalazioni con l'azione che risolve ciascuna.
 */
export function Readout({ analysis, scheme, busy, vbg, issues, onTab, onAction }: Props) {
  const result = analysis.results.find((r) => r.scheme === scheme)
  const ok = result?.ok ? result : null
  const gs1 = analysis.gs1
  const encodable = analysis.results.filter((r) => r.ok).length
  const warn = issues.length > 0

  return (
    <div className="readout-wrap">
      {issues.length > 0 && (
        <ul className="issues" aria-live="polite">
          {issues.map((i) => (
            <IssueRow key={i.id + i.title} issue={i} onAction={onAction} />
          ))}
        </ul>
      )}

      {!analysis.error && (
        <section className={busy ? 'readout busy' : 'readout'}>
          <header className="ro-head">
            <div className="ro-title">
              <span className={`badge ${warn ? 'badge-warn' : 'badge-ok'}`}>
                {warn ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                {warn ? t('Da verificare') : t('Valido')}
              </span>
              <h2>{analysis.key ? analysis.key.name : t('Dati GS1 validi')}</h2>
              {busy && <Loader2 size={16} className="spin" aria-label={t('Calcolo in corso')} />}
            </div>
            <div className="ro-actions">
              {ok && <CopyButton value={ok.hex} label={t('Copia l’EPC in esadecimale')} text="HEX" />}
              {ok && <CopyButton value={ok.bits} label={t('Copia in binario')} text="BIN" />}
              <CopyButton value={() => window.location.href} label={t('Copia il link a questa decodifica')} text={t('Link')} icon={<Link2 size={15} />} />
            </div>
          </header>

          {ok ? <HexView result={ok} /> : <p className="ro-none">{t('Nessun EPC da mostrare: vedi le segnalazioni qui sopra.')}</p>}

          <dl className="ro-stats">
            <Stat icon={<RfidTagIcon size={18} />} tile="teal" label={t('Schema')} value={ok ? ok.scheme : '—'} note={ok ? KIND_INFO[ok.kind].label : undefined} />
            <Stat icon={<Binary size={18} />} tile="teal" label={t('Lunghezza')} value={ok ? t('{bits} bit', { bits: ok.length }) : '—'} note={ok ? t('{words} parole da 16 bit', { words: Math.ceil(ok.length / 16) }) : undefined} />
            <Stat icon={<Filter size={17} />} tile="blue" label="Filter" value={String(analysis.params.filter)} note={ok ? filterMeaning(familyOf(ok.scheme), analysis.params.filter) : undefined} />
            {analysis.results.length > 0 && (
              <Stat icon={<Layers size={18} />} tile={encodable ? 'blue' : 'orange'} label={t('Schemi EPC')} value={t('{ok} su {total}', { ok: encodable, total: analysis.results.length })} note={t('codificabili con questi dati')} onClick={() => onTab('formats')} />
            )}
            {vbg && (
              <Stat
                icon={<BadgeCheck size={18} />}
                tile={vbg === 'loading' ? 'gray' : vbg.state === 'verified' || vbg.state === 'licensed' ? 'forest' : vbg.state === 'invalid' ? 'red' : 'orange'}
                label="Verified by GS1"
                value={vbg === 'loading' ? t('Verifica…') : vbg.state === 'verified' ? t('Verificato') : vbg.state === 'licensed' ? t('Licenza trovata') : vbg.state === 'invalid' ? t('Non valido') : t('Non disponibile')}
                note={vbg !== 'loading' ? (vbg.state === 'verified' ? vbg.name : vbg.state === 'licensed' ? vbg.licensee?.name : undefined) : undefined}
                tone={vbg === 'loading' ? undefined : vbg.state === 'verified' || vbg.state === 'licensed' ? 'ok' : vbg.state === 'invalid' ? 'bad' : 'warn'}
                onClick={() => onTab('vbg')}
              />
            )}
          </dl>

          <table className="ro-table">
            <thead>
              <tr>
                <th scope="col">{t('Rappresentazione')}</th>
                <th scope="col">{t('Valore')}</th>
                <th scope="col">
                  <span className="visually-hidden">{t('Copia')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ok?.uris.tag && <Row icon={<RfidTagIcon size={17} />} tile="teal" label="EPC Tag URI" note={t('Campi del tag in testo')} value={ok.uris.tag} />}
              {ok?.uris.pure && <Row icon={<Fingerprint size={17} />} tile="blue" label="EPC Pure Identity URI" note={t('L’identità, usata in EPCIS')} value={ok.uris.pure} />}
              {gs1?.dl && <Row icon={<DigitalLinkIcon size={17} />} tile="forest" label="GS1 Digital Link" note={t('La chiave come link web')} value={ok?.uris.dl ?? gs1.dl} />}
              {gs1 && <Row icon={<KeyDataIcon size={17} />} tile="blue" label="Element string" note={t('Con gli AI, come nei barcode')} value={gs1.elementString} />}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

type TileTone = 'blue' | 'teal' | 'forest' | 'orange' | 'red' | 'gray'

function Stat({ icon, tile, label, value, note, tone, onClick }: { icon: ReactNode; tile: TileTone; label: string; value: string; note?: string; tone?: 'ok' | 'warn' | 'bad'; onClick?: () => void }) {
  const body = (
    <>
      <span className={`tile tile-${tile}`} aria-hidden>
        {icon}
      </span>
      <span className="stat-text">
        <dt>{label}</dt>
        <dd className={tone ? `tone-${tone}` : undefined}>{value}</dd>
        {note && <dd className="stat-note">{note}</dd>}
      </span>
    </>
  )
  return onClick ? (
    <button type="button" className="stat stat-link" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="stat">{body}</div>
  )
}

function Row({ icon, tile, label, note, value }: { icon: ReactNode; tile: TileTone; label: string; note: string; value: string }) {
  return (
    <tr>
      <th scope="row">
        <span className="row-head">
          <span className={`tile tile-sm tile-${tile}`} aria-hidden>
            {icon}
          </span>
          <span className="row-text">
            <span className="row-label">{label}</span>
            <span className="row-note">{note}</span>
          </span>
        </span>
      </th>
      <td>
        <code className="mono">{value}</code>
      </td>
      <td className="row-copy">
        <CopyButton value={value} label={t('Copia {what}', { what: label })} />
      </td>
    </tr>
  )
}

function IssueRow({ issue, onAction }: { issue: Issue; onAction: (a: IssueAction) => void }) {
  const ref = useRef<HTMLLIElement>(null)
  useLayoutEffect(() => alertIn(ref.current, issue.level === 'error'), [])
  const Icon = issue.level === 'error' ? AlertOctagon : AlertTriangle
  return (
    <li className={`issue issue-${issue.level}`} ref={ref} role={issue.level === 'error' ? 'alert' : undefined}>
      <span className="issue-icon">
        <Icon size={18} />
      </span>
      <div className="issue-text">
        <p className="issue-title">{issue.title}</p>
        {issue.markup && <Markup text={issue.markup} />}
        {issue.detail && <p className="issue-detail">{issue.detail}</p>}
      </div>
      {issue.actions.length > 0 && (
        <div className="issue-actions">
          {issue.actions.map((a) => (
            <button key={a.label} type="button" className="issue-btn" onClick={() => onAction(a)}>
              {a.label} <ArrowRight size={14} />
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

/** Esadecimale a parole da 16 bit, con i 4 bit di ogni cifra colorati per campo. */
function HexView({ result }: { result: Ok }) {
  const [hover, setHover] = useState<number | null>(null)
  const scope = useRef<HTMLDivElement>(null)
  const prev = useRef<{ hex: string; layout: string } | null>(null)
  const colors = segmentColors(result.segments)
  const owner = useMemo(() => {
    const o: number[] = []
    result.segments.forEach((s, k) => {
      for (let i = 0; i < s.bits.length; i++) o.push(k)
    })
    return o
  }, [result])
  const hex = result.hex
  const words = hex.match(/.{1,4}/g) ?? []
  const active = hover !== null ? result.segments[hover] : null
  const layout = `${result.scheme}:${result.segments.map((s) => s.bits.length).join(',')}`

  // Scendono solo le cifre cambiate; se cambia la struttura dei campi, i bit si ridisegnano a onda.
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return
    const before = prev.current
    const chars = [...root.querySelectorAll('.hx-ch')]
    rollIn(before ? chars.filter((_, i) => before.hex[i] !== hex[i]) : chars)
    if (!before || before.layout !== layout) waveIn([...root.querySelectorAll('.hx-bit')])
    prev.current = { hex, layout }
  }, [hex, layout])

  return (
    <div className="hexview" ref={scope} onMouseLeave={() => setHover(null)}>
      <div className="hx-words" role="img" aria-label={t('EPC in esadecimale: {hex}', { hex })}>
        {words.map((w, wi) => (
          <span className="hx-word" key={wi}>
            {[...w].map((ch, ci) => {
              const n = wi * 4 + ci
              const bits = result.bits.slice(n * 4, n * 4 + 4).padEnd(4, ' ')
              const owners = [0, 1, 2, 3].map((b) => owner[n * 4 + b])
              const lit = hover !== null && owners.includes(hover)
              return (
                <span className={`hx-nib ${hover !== null && !lit ? 'dim' : ''}`} key={ci}>
                  <span className="hx-ch mono">{ch}</span>
                  <span className="hx-bits">
                    {[...bits].map((b, bi) => {
                      const k = owners[bi]
                      return k === undefined ? (
                        <i key={bi} className="hx-bit pad" />
                      ) : (
                        <i
                          key={bi}
                          className={`hx-bit ${hover === k ? 'on' : ''}`}
                          style={{ background: colors[k] }}
                          title={`${result.segments[k].label} · bit ${n * 4 + bi}: ${b}`}
                          onMouseEnter={() => setHover(k)}
                          onClick={() => setHover(k)}
                        />
                      )
                    })}
                  </span>
                </span>
              )
            })}
          </span>
        ))}
      </div>
      <div className="hx-under">
        {active ? (
          <p className="hx-caption">
            <i className="hx-swatch" style={{ background: colors[hover!] }} />
            <strong>{active.label}</strong>
            <span className="mono">
              bit {active.start}–{active.start + active.bits.length - 1}
            </span>
            {active.value !== undefined && active.value !== '' && <span className="mono hx-val">{String(active.value)}</span>}
          </p>
        ) : (
          <ul className="hx-legend" aria-label={t('Campi dell’EPC')}>
            {result.segments.map((s, k) => (
              <li key={k} onMouseEnter={() => setHover(k)} onFocus={() => setHover(k)} onClick={() => setHover(k)} tabIndex={0}>
                <i style={{ background: colors[k] }} />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
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
