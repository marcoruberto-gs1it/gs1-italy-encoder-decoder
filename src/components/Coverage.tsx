import { useRef } from 'react'
import { Check, X, RotateCw } from 'lucide-react'
import type { Analysis } from '../gs1/analyze'
import type { SchemeResult } from '../gs1/epc'
import { KIND_INFO } from '../gs1/schemes'
import { aiLabel } from '../gs1/aiDictionary'
import { useMotion, gsap } from '../motion'
import { t } from '../i18n'

type State = 'in' | 'out' | 'derived'
type Item = { id: string; label: string; code?: string; state: State; why?: string }

/** Che cosa di questi dati finisce nel tag con lo schema dato, e che cosa no. */
export function coverageOf(analysis: Analysis, result: Extract<SchemeResult, { ok: true }>): Item[] {
  const dropped = new Set(result.dropped.map((a) => a.ai))
  const keyAis = new Set(analysis.key?.fields.map((f) => f.ai))
  const items: Item[] = analysis.ais.map((a) => ({
    id: a.ai,
    code: `(${a.ai})`,
    label: aiLabel(a.ai),
    state: dropped.has(a.ai) ? 'out' : 'in',
    why: dropped.has(a.ai) ? t('Gli schemi TDS 1.x contengono solo la chiave: i dati aggiuntivi (+AIDC) non hanno posto.') : keyAis.has(a.ai) ? undefined : t('Scritto come dato aggiuntivo (+AIDC) dopo la chiave.'),
  }))
  const hasCheckDigit = analysis.key?.fields.some((f) => f.checkDigitLength)
  if (hasCheckDigit) {
    items.push({
      id: 'cd',
      label: t('Cifra di controllo'),
      state: result.kind === 'legacy' ? 'derived' : 'in',
      why: result.kind === 'legacy' ? t('Non è memorizzata: il lettore la ricalcola quando ricostruisce la chiave.') : t('La chiave è scritta per intero, cifra di controllo compresa.'),
    })
  }
  items.push({
    id: 'host',
    label: t('Dominio del GS1 Digital Link'),
    state: result.kind === 'plusplus' ? 'in' : 'out',
    why:
      result.kind === 'plusplus'
        ? t('Il tag porta {host}: ricostruisce da solo il link del brand.', { host: analysis.params.hostname })
        : t('Non è nel tag: per il Digital Link il sistema usa un dominio configurato (di solito id.gs1.org).'),
  })
  return items
}

const ICON: Record<State, typeof Check> = { in: Check, out: X, derived: RotateCw }

/** Riquadro "cosa contiene il tag" per lo schema scelto. */
export function TagContents({ analysis, result }: { analysis: Analysis; result: SchemeResult | undefined }) {
  const scope = useRef<HTMLDivElement>(null)
  const ok = result?.ok ? result : null
  useMotion(
    scope,
    () => {
      gsap.from('.tc-item', { y: 8, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' })
      gsap.from('.tc-item.out .tc-strike', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.4, stagger: 0.08, delay: 0.25, ease: 'power2.inOut' })
    },
    [ok?.scheme, ok?.hex],
  )
  if (!ok) return null
  const items = coverageOf(analysis, ok)
  const out = items.filter((i) => i.state === 'out')
  const lost = out.filter((i) => i.code)
  return (
    <div className={`tag-contents ${lost.length ? 'warn' : ''}`} ref={scope}>
      <div className="tc-head">
        <strong>{t('Cosa contiene un tag {scheme}', { scheme: ok.scheme })}</strong>
        {lost.length > 0 ? (
          <span className="pill bad">
            {lost.length === 1 ? t('1 dato GS1 resta fuori dal tag') : t('{n} dati GS1 restano fuori dal tag', { n: lost.length })}
          </span>
        ) : (
          <span className="pill ok">{t('Tutti i dati GS1 sono nel tag')}</span>
        )}
      </div>
      <ul className="tc-list">
        {items.map((i) => {
          const Icon = ICON[i.state]
          return (
            <li key={i.id} className={`tc-item ${i.state}`} title={i.why}>
              <span className="tc-icon">
                <Icon size={14} strokeWidth={3} />
              </span>
              <span className="tc-text">
                <span className="tc-label">
                  {i.code && <b className="mono">{i.code}</b>} {i.label}
                  {i.state === 'out' && <span className="tc-strike" />}
                </span>
                {i.why && <span className="tc-why">{i.why}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {lost.length > 0 && (
        <p className="tc-tip">
          {t('Per scrivere anche {list} nel tag usa uno schema + o ++. Con {scheme} questi dati devono stare altrove: nel barcode, nella User Memory o nel sistema informativo.', {
            list: lost.map((i) => i.label.toLowerCase()).join(', '),
            scheme: ok.scheme,
          })}
        </p>
      )}
    </div>
  )
}

/** Confronto tra tutti gli schemi: per ogni dato, se entra nel tag. */
export function CoverageMatrix({ analysis, scheme, onScheme }: { analysis: Analysis; scheme?: string | null; onScheme?: (s: string) => void }) {
  const ok = analysis.results.filter((r): r is Extract<SchemeResult, { ok: true }> => r.ok)
  if (!ok.length) return null
  const cols = ok.map((r) => ({ r, items: coverageOf(analysis, r) }))
  const rows = cols[0].items.map((i) => ({ id: i.id, code: i.code, label: i.label }))
  return (
    <div className="table-wrap">
      <table className="coverage">
        <thead>
          <tr>
            <th>{t('Dato')}</th>
            {cols.map(({ r }) => (
              <th key={r.scheme} className={r.scheme === scheme ? 'sel' : ''}>
                <button onClick={() => onScheme?.(r.scheme)} disabled={!onScheme}>
                  {r.scheme}
                  <span className={`kind kind-${r.kind}`}>{KIND_INFO[r.kind].label}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.code && <b className="mono">{row.code} </b>}
                {row.label}
              </td>
              {cols.map(({ r, items }) => {
                const it = items.find((x) => x.id === row.id)!
                const Icon = ICON[it.state]
                return (
                  <td key={r.scheme} className={`cov ${it.state} ${r.scheme === scheme ? 'sel' : ''}`} title={it.why}>
                    <Icon size={15} strokeWidth={3} />
                    <span>{it.state === 'in' ? t('nel tag') : it.state === 'derived' ? t('ricalcolata') : t('fuori dal tag')}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
