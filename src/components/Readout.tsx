import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AlertOctagon, AlertTriangle, ArrowRight, BadgeCheck, Binary, CheckCircle2, ChevronRight, Filter, Fingerprint, Layers, Link2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle } from '@/components/ui/misc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { DigitalLinkIcon, KeyDataIcon, RfidTagIcon } from './Art'
import type { Analysis } from '../gs1/analyze'
import type { SchemeResult } from '../gs1/epc'
import type { Verification } from '../gs1/vbg'
import { KIND_INFO, filterMeaning, familyOf } from '../gs1/schemes'
import { segmentColors } from '../colors'
import type { Issue, IssueAction } from '../issues'
import { alertIn, rollIn, waveIn } from '../motion'
import { CopyButton } from './Copy'
import { LottieIcon } from './LottieIcon'
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
    <div className="flex flex-col gap-3.5">
      {issues.length > 0 && (
        <ul className="issues flex flex-col gap-2.5" aria-live="polite">
          {issues.map((i) => (
            <IssueRow key={i.id + i.title} issue={i} onAction={onAction} />
          ))}
        </ul>
      )}

      {!analysis.error && (
        <Card className={cn('readout gap-0 overflow-hidden py-0', busy && 'busy')}>
          <header className="ro-head flex flex-wrap items-center justify-between gap-3 px-8 pt-6 phone:px-4 phone:pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <Badge variant={warn ? 'warning' : 'success'} className="h-7 gap-1.5 rounded-full px-3 text-sm font-semibold">
                {warn ? <AlertTriangle className="size-4!" /> : <LottieIcon name="check" size={17} replay={ok?.hex ?? gs1?.elementString} className="lottie-current" fallback={<CheckCircle2 className="size-4!" />} />}
                {warn ? t('Da verificare') : t('Valido')}
              </Badge>
              <h2 className="text-[15px] font-medium text-muted-foreground">{analysis.key ? analysis.key.name : t('Dati GS1 validi')}</h2>
              {busy && <Loader2 size={16} className="spin text-muted-foreground" aria-label={t('Calcolo in corso')} />}
            </div>
            <div className="ro-actions flex gap-1.5 phone:w-full phone:*:flex-1">
              {ok && <CopyButton value={ok.hex} label={t('Copia l’EPC in esadecimale')} text="HEX" />}
              {ok && <CopyButton value={ok.bits} label={t('Copia in binario')} text="BIN" />}
              <CopyButton value={() => window.location.href} label={t('Copia il link a questa decodifica')} text={t('Link')} icon={<Link2 />} />
            </div>
          </header>

          {ok ? <HexView result={ok} /> : <p className="px-8 pt-5 pb-2 text-[15px] text-muted-foreground phone:px-4">{t('Nessun EPC da mostrare: vedi le segnalazioni qui sopra.')}</p>}

          <dl className="mx-8 mt-5 mb-6 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2 border-t pt-5 phone:mx-4 phone:grid-cols-2 phone:gap-1">
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

          <Table className="border-t">
            <TableHeader className="phone:hidden">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="pl-8">{t('Rappresentazione')}</TableHead>
                <TableHead scope="col">{t('Valore')}</TableHead>
                <TableHead scope="col" className="pr-8">
                  <span className="visually-hidden">{t('Copia')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ok?.uris.tag && <Row icon={<RfidTagIcon size={17} />} tile="teal" label="EPC Tag URI" note={t('Campi del tag in testo')} value={ok.uris.tag} />}
              {ok?.uris.pure && <Row icon={<Fingerprint size={17} />} tile="blue" label="EPC Pure Identity URI" note={t('L’identità, usata in EPCIS')} value={ok.uris.pure} />}
              {gs1?.dl && <Row icon={<DigitalLinkIcon size={17} />} tile="forest" label="GS1 Digital Link" note={t('La chiave come link web')} value={ok?.uris.dl ?? gs1.dl} />}
              {gs1 && <Row icon={<KeyDataIcon size={17} />} tile="blue" label="Element string" note={t('Con gli AI, come nei barcode')} value={gs1.elementString} />}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

type TileTone = 'blue' | 'teal' | 'forest' | 'orange' | 'red' | 'gray'

function Stat({ icon, tile, label, value, note, tone, onClick }: { icon: ReactNode; tile: TileTone; label: string; value: string; note?: string; tone?: 'ok' | 'warn' | 'bad'; onClick?: () => void }) {
  const body = (
    <>
      <span className={`tile tile-${tile} phone:hidden!`} aria-hidden>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-[13px] text-muted-foreground">{label}</dt>
        <dd className={cn('text-lg leading-tight font-semibold tracking-tight', tone === 'ok' && 'text-success', tone === 'warn' && 'text-warning', tone === 'bad' && 'text-destructive')}>{value}</dd>
        {note && <dd className="line-clamp-2 text-xs text-muted-foreground">{note}</dd>}
      </span>
    </>
  )
  const cls = 'flex min-w-0 items-start gap-3 rounded-lg p-2.5 text-left'
  return onClick ? (
    <button type="button" className={cn(cls, 'group relative cursor-pointer pr-6 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50')} onClick={onClick}>
      {body}
      <ChevronRight className="absolute top-3 right-1.5 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Row({ icon, tile, label, note, value }: { icon: ReactNode; tile: TileTone; label: string; note: string; value: string }) {
  return (
    <TableRow className="phone:grid phone:grid-cols-[minmax(0,1fr)_auto] phone:py-2.5 phone:pr-2 phone:pl-4">
      <TableHead scope="row" className="h-auto w-[30%] py-3 pl-8 whitespace-normal text-foreground phone:w-auto phone:p-0">
        <span className="flex items-center gap-3">
          <span className={`tile tile-sm tile-${tile} phone:hidden!`} aria-hidden>
            {icon}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs font-normal text-muted-foreground">{note}</span>
          </span>
        </span>
      </TableHead>
      <TableCell className="phone:col-span-2 phone:row-start-2 phone:p-0 phone:pt-1">
        <code className="font-mono text-[13px] [overflow-wrap:anywhere] text-foreground/80">{value}</code>
      </TableCell>
      <TableCell className="w-px pr-8 phone:col-start-2 phone:row-start-1 phone:w-auto phone:p-0">
        <CopyButton value={value} label={t('Copia {what}', { what: label })} />
      </TableCell>
    </TableRow>
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
