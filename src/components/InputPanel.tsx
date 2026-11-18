import { Hash, Plus, Trash2, Wand2, ArrowRightLeft, Play, BadgeCheck, Loader2, X } from 'lucide-react'
import type { Mode } from '../App'
import { prefixDigits, type Analysis, type Params } from '../gs1/analyze'
import { KEY_TYPES, SCHEMES_BY_FAMILY, familyOf, filterOptions, keyType, kindOf, type Ai } from '../gs1/schemes'
import { aiLabel } from '../gs1/aiDictionary'
import { computeCheckDigit, isCheckDigitValid } from '../gs1/checkDigit'
import { SchemeSelect } from './EpcParts'
import { KeyDataIcon, ReaderIcon, RfidTagIcon } from './Art'
import { Dropdown } from './Dropdown'
import { t } from '../i18n'

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

  return (
    <section className="input-panel" aria-label={mode === 'encode' ? t('Dati da codificare') : t('Dato da decodificare')}>
      {mode === 'encode' ? (
        <div className="encoder">
          <div className="field-group">
            <label className="group-label" htmlFor="key-type">
              <span className="tile tile-xs tile-blue" aria-hidden>
                <KeyDataIcon size={15} />
              </span>
              {t('Che cosa vuoi identificare?')}
            </label>
            <Dropdown id="key-type" value={encoder.keyId} onChange={chooseKey} options={KEY_TYPES.map((k) => ({ value: k.id, label: k.name, detail: k.description, aside: <span className="kind kind-legacy">{k.short}</span> }))} />
          </div>

          <div className="field-group">
            <div className="group-row">
              <span className="group-label">
                <span className="tile tile-xs tile-blue" aria-hidden>
                  <Hash size={15} />
                </span>
                {t('I dati della chiave')}
              </span>
              <button type="button" className="text-btn" onClick={useExample}>
                <Play size={13} /> {t('Usa un esempio')}
              </button>
            </div>
            <div className="key-fields">
              {key.fields.map((f) => {
                const value = encoder.values[f.ai] ?? ''
                const digits = f.ai === '01' ? value.padStart(14, '0') : value
                const cdPart = f.checkDigitLength ? digits.slice(0, f.checkDigitLength) : ''
                const cdOk = f.checkDigitLength && /^\d+$/.test(cdPart) && cdPart.length === f.checkDigitLength && value.length >= (f.ai === '01' ? 8 : f.checkDigitLength) ? isCheckDigitValid(cdPart) : undefined
                const canComplete = f.checkDigitLength && /^\d+$/.test(value) && (f.ai === '01' ? [7, 11, 12, 13].includes(value.length) : value.length === f.checkDigitLength - 1)
                return (
                  <label className={`field ${!value && !f.optional && started ? 'missing' : ''}`} key={f.ai}>
                    <span className="field-label">
                      <span className="ai-tag">AI {f.ai}</span> {f.label}
                      {f.optional && <em> · {t('facoltativo')}</em>}
                      {!value && !f.optional && started && <span className="req-tag">{t('obbligatorio')}</span>}
                    </span>
                    <div className="input-row">
                      <input id={`ai-${f.ai}`} className="mono" aria-invalid={cdOk === false || undefined} value={value} placeholder={f.placeholder} spellCheck={false} autoComplete="off" onChange={(e) => setValue(f.ai, e.target.value.trim())} />
                      {canComplete && (
                        <button type="button" className="ghost small" onClick={() => setValue(f.ai, value + computeCheckDigit(f.ai === '01' ? value.padStart(13, '0') : value))} title={t('Aggiunge la cifra di controllo GS1')}>
                          <Wand2 size={15} /> {t('Cifra di controllo')}
                        </button>
                      )}
                    </div>
                    <span className={cdOk === false ? 'hint bad' : cdOk ? 'hint ok' : 'hint'}>
                      {cdOk === false ? t('Cifra di controllo errata: dovrebbe essere {cd}', { cd: computeCheckDigit(cdPart.slice(0, -1)) }) : cdOk ? `✓ ${t('Cifra di controllo corretta')}` : f.hint}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="field-group">
            <span className="group-label">
              <span className="tile tile-xs tile-blue" aria-hidden>
                <Plus size={15} />
              </span>
              {t('Dati aggiuntivi')} <span className="muted">{t('facoltativi')}</span>
            </span>
            <div className="extras">
              {encoder.extras.map((x, i) => (
                <div className="extra" key={i}>
                  <Dropdown
                    ariaLabel="Application Identifier"
                    value={EXTRA_AIS.some((e) => e.ai === x.ai) ? x.ai : 'altro'}
                    onChange={(v) => setExtra(i, { ai: v === 'altro' ? '' : v })}
                    options={[...EXTRA_AIS.map((e) => ({ value: e.ai, label: aiLabel(e.ai), aside: <span className="ai-tag">AI {e.ai}</span> })), { value: 'altro', label: t('Altro AI…'), detail: t('Scrivi il numero dell’AI') }]}
                  />
                  {!EXTRA_AIS.some((e) => e.ai === x.ai) && <input className="mono ai-input" value={x.ai} placeholder="AI" onChange={(e) => setExtra(i, { ai: e.target.value.replace(/\D/g, '') })} />}
                  <input className="mono" value={x.value} placeholder={EXTRA_AIS.find((e) => e.ai === x.ai)?.placeholder ?? 'valore'} onChange={(e) => setExtra(i, { value: e.target.value })} />
                  <button className="icon-btn soft" aria-label={t('Rimuovi')} onClick={() => setEncoder({ ...encoder, extras: encoder.extras.filter((_, k) => k !== i) })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button className="ghost small" onClick={addExtra}>
                <Plus size={15} /> {t('Aggiungi un AI')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="decoder">
          <label className="group-label" htmlFor="decode-input">
            <span className="tile tile-xs tile-teal" aria-hidden>
              <ReaderIcon size={15} />
            </span>
            {t('Incolla qualsiasi rappresentazione GS1')}
          </label>
          <textarea
            id="decode-input"
            className="mono"
            aria-invalid={Boolean(analysis?.error) || undefined}
            rows={3}
            value={p.decodeText}
            spellCheck={false}
            placeholder={t('EPC letto dal tag in esadecimale o binario, urn:epc:…, https://id.gs1.org/01/…, (01)…(21)…, dati del lettore o un GTIN')}
            onChange={(e) => p.setDecodeText(e.target.value)}
          />
          {p.decodeText && (
            <button type="button" className="text-btn clear-btn" onClick={() => p.setDecodeText('')}>
              <X size={14} /> {t('Svuota')}
            </button>
          )}
          {analysis?.detected && (
            <div className="detected">
              <span className="pill ok">{t('Riconosciuto: {what}', { what: analysis.detected })}</span>
              {analysis.key && (
                <button className="text-btn" onClick={p.onOpenInEncoder}>
                  <ArrowRightLeft size={14} /> {t('Modifica nell’encoder')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {schemes.length > 0 && (
        <div className="field-group tag-params">
          <label className="group-label" htmlFor="tag-type">
            <span className="tile tile-xs tile-teal" aria-hidden>
              <RfidTagIcon size={15} />
            </span>
            {t('Il tag RFID')}
          </label>
          <span className="field-label">{t('Tipo di tag (schema EPC)')}</span>
          <SchemeSelect id="tag-type" quiet schemes={schemes} results={analysis?.results ?? []} scheme={p.scheme} onScheme={p.setScheme} />
          <div className="params">
            <label className="field">
              <span className="field-label">Filter value</span>
              <Dropdown ariaLabel="Filter value" value={String(params.filter)} onChange={(v) => setParams({ ...params, filter: Number(v) })} options={filterOptions(familyOf(family!)).map((o) => ({ value: String(o.value), label: o.label }))} />
            </label>
            {kind === 'legacy' && (
              <div className={`field ${!analysis?.gcp.length && !analysis?.gcp.pending && !params.gcpLength ? 'needs' : ''}`}>
                <span className="field-label">GS1 Company Prefix</span>
                <GcpField analysis={analysis} params={params} setParams={setParams} />
              </div>
            )}
            {kind === 'plusplus' && (
              <label className="field">
                <span className="field-label">{t('Dominio del GS1 Digital Link')}</span>
                <input className="mono" value={params.hostname} placeholder="id.gs1.org" onChange={(e) => setParams({ ...params, hostname: e.target.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') })} />
                <span className="hint">{t('Scritto compresso nel tag: il tag ricostruisce il link del brand.')}</span>
              </label>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** Il GS1 Company Prefix arriva da Verified by GS1 (o dal tag letto); se manca lo sceglie l'utente. */
function GcpField({ analysis, params, setParams }: { analysis: Analysis | null; params: Params; setParams: (p: Params) => void }) {
  const gcp = analysis?.gcp
  const digits = analysis ? prefixDigits(analysis.ais) : undefined
  if (gcp?.source === 'Verified by GS1' || gcp?.source === 'tag') {
    return (
      <>
        <div className="locked-value">
          <BadgeCheck size={17} />
          <span className="mono">{digits?.slice(0, gcp.length!)}</span>
          <span className="muted">· {t('{n} cifre', { n: gcp.length! })}</span>
        </div>
        <span className="hint ok">{gcp.source === 'tag' ? t('Letto dalla partizione del tag.') : t('Dalla licenza registrata su Verified by GS1.')}</span>
      </>
    )
  }
  if (gcp?.pending) {
    return (
      <>
        <div className="locked-value">
          <Loader2 size={17} className="spin" /> {t('Verifica su Verified by GS1…')}
        </div>
        <span className="hint">{t('La lunghezza arriva dalla licenza del titolare.')}</span>
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
        onChange={(v) => setParams({ ...params, gcpLength: Number(v) })}
        options={[6, 7, 8, 9, 10, 11, 12].map((n) => ({ value: String(n), label: t('{n} cifre', { n }), aside: digits && digits.length >= n ? <span className="mono muted">{digits.slice(0, n)}</span> : undefined }))}
      />
      <span className={params.gcpLength ? 'hint' : 'hint bad'}>
        {params.gcpLength ? t('Scelta da te: Verified by GS1 non la fornisce per questo codice.') : t('Verified by GS1 non la fornisce: sceglila per gli schemi TDS 1.x.')}
      </span>
    </>
  )
}
