import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AlertOctagon, AlertTriangle, ArrowRight, BadgeCheck, Binary, CheckCircle2, ChevronRight, Filter, Layers, Link2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { ConceptIcon, keyIcon } from '@/icons'
import type { ReactNode } from 'react'
import { RfidTagIcon } from './Art'
import type { Analysis } from '../gs1/analyze'
import type { SchemeResult } from '../gs1/epc'
import type { Verification } from '../gs1/vbg'
import { KIND_INFO, filterMeaning, familyOf } from '../gs1/schemes'
import { segmentColors } from '../colors'
import type { Issue, IssueAction } from '../issues'
import { alertIn, rollIn, waveIn } from '../motion'
import { CopyButton, CopyText } from './Copy'
import { LottieIcon } from './LottieIcon'
import { AiList, ColoredDl, ColoredEs } from './GsData'
import { Rich } from './Rich'
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
 * Riepilogo in chiaro, per tutti: i dati GS1 con ogni AI nel suo colore, l'element string,
 * il GS1 Digital Link e l'EPC Pure Identity URI. L'EPC per il tag RFID e i dettagli tecnici
 * sono nelle sezioni sotto. Sopra, le segnalazioni con l'azione che risolve ciascuna.
 */
export function Readout({ analysis, scheme, busy, vbg, issues, onTab, onAction }: Props) {
  const result = analysis.results.find((r) => r.scheme === scheme)
  const ok = result?.ok ? result : null
  const gs1 = analysis.gs1
  const warn = issues.length > 0
  const pure = ok?.uris.pure ?? analysis.results.find((r): r is Ok => r.ok && Boolean(r.uris.pure))?.uris.pure
  // Il Digital Link completo (con tutti gli AI, anche nella query); con uno schema ++ il dominio è quello scritto nel tag.
  const dl = gs1?.dl && ok?.kind === 'plusplus' ? gs1.dl.replace(/^https:\/\/id\.gs1\.org/, `https://${analysis.params.hostname}`) : (gs1?.dl ?? ok?.uris.dl)

  return (
    <div className="flex flex-col gap-3.5">
      {issues.length > 0 && (
        <ul className="issues flex flex-col gap-2.5" aria-live="polite">
          {issues.map((i) => (
            <IssueRow key={i.id + i.title} issue={i} onAction={onAction} />
          ))}
        </ul>
      )}

      {!analysis.error && gs1 && (
        <Card className={cn('readout gap-0 overflow-hidden py-0', busy && 'busy')}>
          <header className="ro-head flex flex-wrap items-center justify-between gap-3 px-8 pt-6 phone:px-4 phone:pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <Badge variant={warn ? 'warning' : 'success'} className="h-7 gap-1.5 rounded-full px-3 text-sm font-semibold">
                {warn ? <AlertTriangle className="size-4!" /> : <LottieIcon name="check" size={17} replay={gs1.elementString} className="lottie-current" fallback={<CheckCircle2 className="size-4!" />} />}
                {warn ? t('Da verificare') : t('Valido')}
              </Badge>
              <h2 className="flex items-center gap-2 text-[17px] font-bold text-primary">
                <ConceptIcon icon={keyIcon(analysis.key?.id)} size="xs" />
                {analysis.key ? analysis.key.name : t('Dati GS1 validi')}
              </h2>
              {busy && <Loader2 size={16} className="spin text-muted-foreground" aria-label={t('Calcolo in corso')} />}
            </div>
            <CopyButton value={() => window.location.href} label={t('Copia il link a questa decodifica')} text={t('Link')} icon={<Link2 />} />
          </header>

          <section className="px-8 pt-5 phone:px-4" aria-labelledby="ro-data">
            <h3 id="ro-data" className="mb-2.5 text-sm font-bold text-muted-foreground">
              {t('I dati')}
            </h3>
            <AiList ais={analysis.ais} />
          </section>

          <section className="px-8 pt-6 phone:px-4" aria-labelledby="ro-forms">
            <h3 id="ro-forms" className="mb-2.5 text-sm font-bold text-muted-foreground">
              {t('Come si scrivono')}
            </h3>
            <div className="flex flex-col gap-2.5">
              <Repr label="Element string" note={t('Con gli AI tra parentesi, come sotto i barcode')} value={gs1.elementString} display={<ColoredEs ais={gs1.ais} />} />
              {dl && <Repr label="GS1 Digital Link" note={t('La stessa chiave come link web, per i QR code')} value={dl} display={<ColoredDl url={dl} />} />}
              {pure && <Repr label="EPC Pure Identity URI" note={t('L’identità dell’oggetto, usata in EPCIS')} value={pure} />}
            </div>
          </section>

          <dl className="mx-8 mt-5 mb-6 grid grid-cols-2 gap-2 border-t pt-4 phone:mx-4 phone:grid-cols-1 phone:gap-1">
            <Stat
              icon={<RfidTagIcon size={18} />}
              tile={ok ? 'teal' : 'gray'}
              label={t('EPC per il tag RFID')}
              value={ok ? ok.scheme : t('Non disponibile')}
              note={ok ? ok.hex : (analysis.rfidNote ?? t('Vedi le segnalazioni qui sopra.'))}
              mono={Boolean(ok)}
              onClick={() => onTab('epc')}
            />
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
        </Card>
      )}
    </div>
  )
}

/** Una rappresentazione da copiare: nome, a che cosa serve e il valore (colorato per AI dove ha senso). */
function Repr({ label, note, value, display }: { label: string; note: string; value: string; display?: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-muted/40 py-3 pr-2 pl-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-primary">{label}</p>
          <p className="text-[13px] text-muted-foreground">{note}</p>
        </div>
        <CopyButton value={value} label={t('Copia {what}', { what: label })} />
      </div>
      <code className="mt-1.5 block pr-2 font-mono text-[15px] leading-relaxed [overflow-wrap:anywhere] text-foreground">{display ?? value}</code>
    </div>
  )
}

/** L'EPC per il tag RFID: esadecimale con i bit colorati per campo, parametri e EPC Tag URI. */
export function EpcPanel({ analysis, scheme, onTab }: { analysis: Analysis; scheme: string | null; onTab: (tab: string) => void }) {
  const result = analysis.results.find((r) => r.scheme === scheme)
  const ok = result?.ok ? result : null
  const encodable = analysis.results.filter((r) => r.ok).length
  if (!ok) return <div className="note warn">{analysis.rfidNote ?? (result && !result.ok ? result.error : t('Nessun EPC da mostrare: vedi le segnalazioni qui sopra.'))}</div>
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-muted-foreground">
          <Rich text={t('L’EPC da scrivere nel tag, nello schema **{scheme}**. Passa sopra un colore per vedere il campo: i dati GS1 hanno il colore del loro AI.', { scheme: ok.scheme })} />
        </p>
        <div className="flex gap-1.5">
          <CopyButton value={ok.hex} label={t('Copia l’EPC in esadecimale')} text="HEX" />
          <CopyButton value={ok.bits} label={t('Copia in binario')} text="BIN" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <HexView result={ok} />
      </div>
      <dl className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 phone:grid-cols-2 phone:gap-1">
        <Stat icon={<RfidTagIcon size={18} />} tile="teal" label={t('Schema')} value={ok.scheme} note={KIND_INFO[ok.kind].label} />
        <Stat icon={<Binary size={18} />} tile="teal" label={t('Lunghezza')} value={t('{bits} bit', { bits: ok.length })} note={t('{words} parole da 16 bit', { words: Math.ceil(ok.length / 16) })} />
        <Stat icon={<Filter size={17} />} tile="blue" label="Filter" value={String(analysis.params.filter)} note={filterMeaning(familyOf(ok.scheme), analysis.params.filter)} />
        <Stat icon={<Layers size={18} />} tile={encodable ? 'blue' : 'orange'} label={t('Schemi EPC')} value={t('{ok} su {total}', { ok: encodable, total: analysis.results.length })} note={t('codificabili con questi dati')} onClick={() => onTab('formats')} />
      </dl>
      {ok.uris.tag && <CopyText label={t('EPC Tag URI: i campi del tag in testo')} value={ok.uris.tag} />}
    </div>
  )
}

type TileTone = 'blue' | 'teal' | 'forest' | 'orange' | 'red' | 'gray'

function Stat({ icon, tile, label, value, note, tone, mono, onClick }: { icon: ReactNode; tile: TileTone; label: string; value: string; note?: string; tone?: 'ok' | 'warn' | 'bad'; mono?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className={`tile tile-${tile} phone:hidden!`} aria-hidden>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pr-4">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className={cn('text-[17px] leading-tight font-bold tracking-tight text-primary', tone === 'ok' && 'text-success', tone === 'warn' && 'text-warning', tone === 'bad' && 'text-destructive')}>{value}</dd>
        {note && <dd className={cn('line-clamp-2 text-[13px] text-muted-foreground', mono && 'font-mono [overflow-wrap:anywhere]')}>{note}</dd>}
      </span>
    </>
  )
  const cls = 'flex min-w-0 items-start gap-3 rounded-lg p-2.5 text-left'
  return onClick ? (
    <button type="button" className={cn(cls, 'group relative cursor-pointer transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50')} onClick={onClick}>
      {body}
      <ChevronRight className="absolute top-3 right-1.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function IssueRow({ issue, onAction }: { issue: Issue; onAction: (a: IssueAction) => void }) {
  const ref = useRef<HTMLLIElement>(null)
  useLayoutEffect(() => alertIn(ref.current, issue.level === 'error'), [])
  const error = issue.level === 'error'
  return (
    <li ref={ref} role={error ? 'alert' : undefined}>
      <Alert variant={error ? 'destructive' : 'warning'} className="items-center gap-y-1 rounded-xl px-4 py-3.5 has-[>.alert-icon]:grid-cols-[2.25rem_1fr] has-[>.alert-icon]:gap-x-3.5 md:grid-cols-[2.25rem_1fr_auto]!">
        <span className={cn('alert-icon grid size-9 place-items-center self-start rounded-lg text-white', error ? 'bg-destructive' : 'bg-gs1-orange')}>
          {error ? <LottieIcon name="cross" size={20} replay={issue.title} className="lottie-current" fallback={<AlertOctagon size={18} />} /> : <AlertTriangle size={18} />}
        </span>
        <div className="col-start-2 min-w-0">
          <AlertTitle className="text-[15px] leading-snug">{issue.title}</AlertTitle>
          {issue.markup && <Markup text={issue.markup} />}
          {issue.detail && <p className={cn('mt-0.5 text-[13.5px]', !error && 'text-[#7c3a1b]')}>{issue.detail}</p>}
        </div>
        {issue.actions.length > 0 && (
          <div className="col-start-2 flex flex-wrap gap-1.5 md:col-start-3 md:row-start-1 md:justify-end">
            {issue.actions.map((a) => (
              <Button key={a.label} variant="outline" size="sm" className={cn('group h-9 bg-white', error ? 'border-destructive/25 text-destructive hover:bg-destructive hover:text-white' : 'border-gs1-orange/30 text-warning hover:bg-gs1-orange hover:text-white')} onClick={() => onAction(a)}>
                {a.label} <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            ))}
          </div>
        )}
      </Alert>
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
