import type { ReactNode } from 'react'
import { Hash, Plus, Trash2, Wand2, ArrowRightLeft, Play, BadgeCheck, Loader2, Eraser, Filter, Building2, Globe, Nfc } from 'lucide-react'
import { AiIcon, ConceptIcon, NumberIcon, OtherIcon, filterIcon, keyIcon } from '@/icons'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label, Separator, Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import type { Mode } from '../App'
import { prefixDigits, type Analysis, type Params } from '../gs1/analyze'
import { KEY_TYPES, SCHEMES_BY_FAMILY, familyOf, filterOptions, keyType, kindOf, type Ai } from '../gs1/schemes'
import { aiLabel } from '../gs1/aiDictionary'
import { computeCheckDigit, isCheckDigitValid } from '../gs1/checkDigit'
import { SchemeSelect } from './EpcParts'
import { KeyDataIcon, ReaderIcon, RfidTagIcon } from './Art'
import { Dropdown } from './Dropdown'
import { t } from '../i18n'
import { LottieIcon } from './LottieIcon'

export type EncoderState = { keyId: string; values: Record<string, string>; extras: Ai[] }

type Props = {
  mode: Mode
  encoder: EncoderState
  setEncoder: (e: EncoderState) => void
  decodeText: string
  setDecodeText: (s: string) => void
  params: Params
  setParams: (p: Params) => void
  analysis: Analysis | null
  scheme: string | null
  setScheme: (s: string) => void
  onOpenInEncoder: () => void
  onReset: () => void
  canReset: boolean
}

/** AI aggiuntivi proposti per i dati +AIDC. */
const EXTRA_AIS: { ai: string; placeholder: string }[] = [
  { ai: '17', placeholder: 'AAMMGG' },
  { ai: '10', placeholder: 'LOT42' },
  { ai: '11', placeholder: 'AAMMGG' },
  { ai: '13', placeholder: 'AAMMGG' },
  { ai: '15', placeholder: 'AAMMGG' },
  { ai: '16', placeholder: 'AAMMGG' },
  { ai: '7003', placeholder: 'AAMMGGhhmm' },
  { ai: '3103', placeholder: '001250' },
  { ai: '422', placeholder: '380' },
  { ai: '7006', placeholder: 'AAMMGG' },
  { ai: '7007', placeholder: 'AAMMGG' },
]

/** Dati aggiuntivi dell'esempio GTIN + seriale. */
const EXAMPLE_EXTRAS: Ai[] = [
  { ai: '17', value: '271231' },
  { ai: '10', value: 'LOT42' },
]

/** Lo stato dell'encoder con i dati d'esempio della chiave scelta. */
export function withExample(e: EncoderState): EncoderState {
  const key = keyType(e.keyId)!
  return { ...e, values: Object.fromEntries(key.example.map((a) => [a.ai, a.value])), extras: key.id === 'sgtin' ? EXAMPLE_EXTRAS : [] }
}

export function InputPanel(p: Props) {
  const { mode, encoder, setEncoder, params, setParams, analysis } = p
  const key = keyType(encoder.keyId)!
  const family = mode === 'decode' ? (analysis?.key?.id ?? null) : key.id
  const schemes = family ? SCHEMES_BY_FAMILY[family] : []
  const kind = p.scheme ? kindOf(p.scheme) : null
  // Nel decoder filter e dominio letti dal tag prevalgono: si mostrano bloccati.
  const fromTag = mode === 'decode' ? analysis?.fromTag : undefined
  const tagFilter = fromTag?.filter && analysis ? analysis.params.filter : null

  const setValue = (ai: string, value: string) => setEncoder({ ...encoder, values: { ...encoder.values, [ai]: value } })
  const chooseKey = (id: string) => {
    setEncoder({ keyId: id, values: {}, extras: [] })
    setParams({ ...params, filter: id === 'sgtin' ? 1 : 0, gcpLength: null })
  }
  const useExample = () => setEncoder(withExample(encoder))
  // Un campo obbligatorio vuoto si segnala solo quando l'utente ha già iniziato a inserire i dati.
  const started = key.fields.some((f) => (encoder.values[f.ai] ?? '').trim()) || encoder.extras.some((x) => x.value.trim())
  const setExtra = (i: number, patch: Partial<Ai>) => setEncoder({ ...encoder, extras: encoder.extras.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const addExtra = () => {
    const next = EXTRA_AIS.find((x) => !encoder.extras.some((e) => e.ai === x.ai) && !key.fields.some((f) => f.ai === x.ai))
    setEncoder({ ...encoder, extras: [...encoder.extras, { ai: next?.ai ?? '', value: '' }] })
  }
  const title = mode === 'encode' ? t('Dati da codificare') : t('Dato da decodificare')

  return (
    <section className="input-panel" aria-label={title}>
      <div className="flex items-center justify-between gap-3 pt-4 pb-2">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        <Tooltip content={t('Svuota i campi e riporta tag e parametri ai valori iniziali')}>
          <Button variant="outline" size="sm" className="text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive" disabled={!p.canReset} onClick={p.onReset}>
            <Eraser /> {t('Cancella i dati')}
          </Button>
        </Tooltip>
      </div>

      {mode === 'encode' ? (
        <div className="encoder">
          <div className="field-group">
            <Label className="group-label" htmlFor="key-type">
              <span className="tile tile-xs tile-blue" aria-hidden>
                <KeyDataIcon size={15} />
              </span>
              {t('Che cosa vuoi identificare?')}
            </Label>
            <Dropdown id="key-type" value={encoder.keyId} onChange={chooseKey} options={KEY_TYPES.map((k) => ({ value: k.id, label: k.name, detail: k.description, icon: <ConceptIcon icon={keyIcon(k.id)} />, aside: <span className="kind kind-legacy">{k.short}</span> }))} />
          </div>

          <Separator />

          <div className="field-group">
            <div className="group-row">
              <span className="group-label">
                <span className="tile tile-xs tile-blue" aria-hidden>
                  <Hash size={15} />
                </span>
                {t('I dati della chiave')}
              </span>
              <Button variant="link" size="sm" onClick={useExample}>
                <Play /> {t('Usa un esempio')}
              </Button>
            </div>
            <div className="key-fields">
              {key.fields.map((f) => {
                const value = encoder.values[f.ai] ?? ''
                const digits = f.ai === '01' ? value.padStart(14, '0') : value
                const cdPart = f.checkDigitLength ? digits.slice(0, f.checkDigitLength) : ''
                const lengthOk = f.ai === '01' ? [8, 12, 13, 14].includes(value.length) : value.length >= (f.checkDigitLength ?? 0)
                const cdOk = f.checkDigitLength && /^\d+$/.test(cdPart) && cdPart.length === f.checkDigitLength && lengthOk ? isCheckDigitValid(cdPart) : undefined
                const canComplete = f.checkDigitLength && /^\d+$/.test(value) && (f.ai === '01' ? [7, 11, 12, 13].includes(value.length) : value.length === f.checkDigitLength - 1)
                const missing = !value && !f.optional && started
                return (
                  <div className={cn('field', missing && 'missing')} key={f.ai}>
                    <Label htmlFor={`ai-${f.ai}`} className="field-label">
                      <AiIcon ai={f.ai} size="xs" />
                      {f.label}
                      {f.optional && <span className="font-medium text-muted-foreground">· {t('facoltativo')}</span>}
                      <span className="ml-auto flex items-center gap-1.5">
                        {missing && <Badge variant="warning">{t('obbligatorio')}</Badge>}
                        <Badge variant="secondary" className="font-mono">
                          AI {f.ai}
                        </Badge>
                      </span>
                    </Label>
                    <div className="flex gap-2">
                      <Input id={`ai-${f.ai}`} className="font-mono" aria-invalid={cdOk === false || missing || undefined} value={value} placeholder={f.placeholder} spellCheck={false} autoComplete="off" onChange={(e) => setValue(f.ai, e.target.value.trim())} />
                      {canComplete && (
                        <Tooltip content={t('Aggiunge la cifra di controllo GS1')}>
                          <Button variant="outline" className="h-10" onClick={() => setValue(f.ai, value + computeCheckDigit(f.ai === '01' ? value.padStart(13, '0') : value))}>
                            <Wand2 /> {t('Cifra di controllo')}
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                    <Hint tone={cdOk === false ? 'bad' : cdOk ? 'ok' : undefined}>
                      {cdOk === false ? t('Cifra di controllo errata: dovrebbe essere {cd}', { cd: computeCheckDigit(cdPart.slice(0, -1)) }) : cdOk ? `✓ ${t('Cifra di controllo corretta')}` : f.hint}
                    </Hint>
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="field-group">
            <span className="group-label">
              <span className="tile tile-xs tile-blue" aria-hidden>
                <Plus size={15} />
              </span>
              {t('Dati aggiuntivi')} <span className="muted">{t('facoltativi')}</span>
            </span>
            <div className="flex flex-col gap-2">
              {encoder.extras.map((x, i) => (
                <div className="flex flex-col gap-2 rounded-2xl bg-muted p-2" key={i}>
                  <div className="flex items-center gap-1">
                    <Dropdown
                      ariaLabel="Application Identifier"
                      className="min-w-0 flex-1"
                      value={EXTRA_AIS.some((e) => e.ai === x.ai) ? x.ai : 'altro'}
                      onChange={(v) => setExtra(i, { ai: v === 'altro' ? '' : v })}
                      options={[...EXTRA_AIS.map((e) => ({ value: e.ai, label: aiLabel(e.ai), icon: <AiIcon ai={e.ai} />, aside: <span className="ai-tag">AI {e.ai}</span> })), { value: 'altro', label: t('Altro AI…'), detail: t('Scrivi il numero dell’AI'), icon: <ConceptIcon icon={OtherIcon} tone="gray" /> }]}
                    />
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={t('Rimuovi')} onClick={() => setEncoder({ ...encoder, extras: encoder.extras.filter((_, k) => k !== i) })}>
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {!EXTRA_AIS.some((e) => e.ai === x.ai) && <Input className="w-20 shrink-0 font-mono" aria-label="Application Identifier" inputMode="numeric" maxLength={4} value={x.ai} placeholder="AI" onChange={(e) => setExtra(i, { ai: e.target.value.replace(/\D/g, '') })} />}
                    <Input id={`ai-${x.ai}`} className="font-mono" aria-label={aiLabel(x.ai) || x.ai} value={x.value} placeholder={EXTRA_AIS.find((e) => e.ai === x.ai)?.placeholder ?? 'valore'} onChange={(e) => setExtra(i, { value: e.target.value })} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="self-start border-dashed text-primary shadow-none" onClick={addExtra}>
                <Plus /> {t('Aggiungi un AI')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="decoder field-group">
          <Label className="group-label" htmlFor="decode-input">
            <span className="tile tile-xs tile-teal" aria-hidden>
              <ReaderIcon size={15} />
            </span>
            {t('Incolla qualsiasi rappresentazione GS1')}
          </Label>
          <Textarea
            id="decode-input"
            className="font-mono text-[13px] leading-relaxed break-all"
            aria-invalid={Boolean(analysis?.error) || undefined}
            rows={3}
            value={p.decodeText}
            spellCheck={false}
            placeholder={t('EPC letto dal tag in esadecimale o binario, urn:epc:…, https://id.gs1.org/01/…, (01)…(21)…, dati del lettore o un GTIN')}
            onChange={(e) => p.setDecodeText(e.target.value)}
          />
          {analysis?.detected && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge variant="success" className="h-auto py-1 whitespace-normal">
                <BadgeCheck /> {t('Riconosciuto: {what}', { what: analysis.detected })}
              </Badge>
              {analysis.key && (
                <Button variant="link" size="sm" onClick={p.onOpenInEncoder}>
                  <ArrowRightLeft /> {t('Modifica nell’encoder')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {schemes.length > 0 && (
        <>
          <Separator />
          <div className="field-group tag-params">
            <Label className="group-label" htmlFor="tag-type">
              <span className="tile tile-xs tile-teal" aria-hidden>
                <RfidTagIcon size={15} />
              </span>
              {t('Il tag RFID')}
            </Label>
            <div className="field">
              <span className="field-label">
                <ConceptIcon icon={Nfc} tone="teal" size="xs" />
                {t('Tipo di tag (schema EPC)')}
              </span>
              <SchemeSelect id="tag-type" quiet schemes={schemes} results={analysis?.results ?? []} scheme={p.scheme} onScheme={p.setScheme} />
            </div>
            <div className="field">
              <span className="field-label">
                <ConceptIcon icon={Filter} size="xs" />
                Filter value
              </span>
              {tagFilter !== null ? (
                <>
                  <Locked>
                    <BadgeCheck /> <span>{filterOptions(familyOf(family!)).find((o) => o.value === tagFilter)?.label ?? tagFilter}</span>
                    <span className="ml-auto opacity-70 [&>svg]:size-4">{(() => { const I = filterIcon(familyOf(family!), tagFilter); return <I /> })()}</span>
                  </Locked>
                  <Hint tone="ok">{t('Letto dal tag.')}</Hint>
                </>
              ) : (
                <Dropdown ariaLabel="Filter value" value={String(params.filter)} onChange={(v) => setParams({ ...params, filter: Number(v) })} options={filterOptions(familyOf(family!)).map((o) => ({ value: String(o.value), label: o.label, icon: <ConceptIcon icon={filterIcon(familyOf(family!), o.value)} /> }))} />
              )}
            </div>
            {kind === 'legacy' && (
              <div className="field">
                <span className="field-label">
                  <ConceptIcon icon={Building2} size="xs" />
                  GS1 Company Prefix
                </span>
                <GcpField analysis={analysis} params={params} setParams={setParams} />
              </div>
            )}
            {kind === 'plusplus' && (
              <div className="field">
                <Label htmlFor="dl-host" className="field-label">
                  <ConceptIcon icon={Globe} tone="forest" size="xs" />
                  {t('Dominio del GS1 Digital Link')}
                </Label>
                <Input id="dl-host" className="font-mono" value={fromTag?.hostname && analysis ? analysis.params.hostname : params.hostname} readOnly={fromTag?.hostname} maxLength={253} placeholder="id.gs1.org" onChange={(e) => setParams({ ...params, hostname: e.target.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') })} />
                <Hint tone={fromTag?.hostname ? 'ok' : undefined}>{fromTag?.hostname ? t('Letto dal tag.') : t('Scritto compresso nel tag: il tag ricostruisce il link del brand.')}</Hint>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Hint({ tone, children }: { tone?: 'ok' | 'bad'; children: ReactNode }) {
  return <p className={cn('hint text-xs leading-snug text-muted-foreground', tone === 'ok' && 'text-success', tone === 'bad' && 'font-medium text-destructive')}>{children}</p>
}

/** Valore non modificabile perché letto dal tag o da Verified by GS1. */
function Locked({ children }: { children: ReactNode }) {
  return <div className="flex min-h-10 items-center gap-2 rounded-md border border-success/25 bg-[#f0faf4] px-3 py-2 text-sm font-medium text-success [&>svg]:size-4 [&>svg]:shrink-0">{children}</div>
}

/** Il GS1 Company Prefix arriva da Verified by GS1 (o dal tag letto); se manca lo sceglie l'utente. */
function GcpField({ analysis, params, setParams }: { analysis: Analysis | null; params: Params; setParams: (p: Params) => void }) {
  const gcp = analysis?.gcp
  const digits = analysis ? prefixDigits(analysis.ais) : undefined
  if (gcp?.source === 'Verified by GS1' || gcp?.source === 'tag') {
    return (
      <>
        <Locked>
          <BadgeCheck />
          <span className="font-mono">{digits?.slice(0, gcp.length!)}</span>
          <span className="font-normal text-muted-foreground">· {t('{n} cifre', { n: gcp.length! })}</span>
        </Locked>
        <Hint tone="ok">{gcp.source === 'tag' ? t('Letto dalla partizione del tag.') : t('Dalla licenza registrata su Verified by GS1.')}</Hint>
      </>
    )
  }
  if (gcp?.pending) {
    return (
      <>
        <div className="flex min-h-10 items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm text-primary">
          <LottieIcon name="scan" size={22} loop className="lottie-current" fallback={<Loader2 size={17} className="spin" />} /> {t('Verifica su Verified by GS1…')}
        </div>
        <Hint>{t('La lunghezza arriva dalla licenza del titolare.')}</Hint>
      </>
    )
  }
  return (
    <>
      <Dropdown
        id="gcp-length"
        ariaLabel={t('Lunghezza del GS1 Company Prefix')}
        value={params.gcpLength ? String(params.gcpLength) : ''}
        placeholder={t('Scegli la lunghezza…')}
        className={params.gcpLength ? undefined : 'border-brand ring-[3px] ring-brand/15'}
        onChange={(v) => setParams({ ...params, gcpLength: Number(v) })}
        options={[6, 7, 8, 9, 10, 11, 12].map((n) => ({ value: String(n), label: t('{n} cifre', { n }), icon: <NumberIcon n={n} />, aside: digits && digits.length >= n ? <span className="mono muted">{digits.slice(0, n)}</span> : undefined }))}
      />
      <Hint tone={params.gcpLength ? undefined : 'bad'}>{params.gcpLength ? t('Scelta da te: Verified by GS1 non la fornisce per questo codice.') : t('Verified by GS1 non la fornisce: sceglila per gli schemi TDS 1.x.')}</Hint>
    </>
  )
}
