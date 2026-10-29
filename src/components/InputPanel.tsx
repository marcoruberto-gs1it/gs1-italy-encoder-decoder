import { useRef } from 'react'
import { Plus, Trash2, Wand2, ArrowRightLeft, ScanLine, PenLine, Sparkles, BadgeCheck, Loader2 } from 'lucide-react'
import type { Mode } from '../App'
import { prefixDigits, type Analysis, type Params } from '../gs1/analyze'
import { KEY_TYPES, SCHEMES_BY_FAMILY, familyOf, filterOptions, keyType, kindOf, type Ai } from '../gs1/schemes'
import { aiLabel } from '../gs1/aiDictionary'
import { computeCheckDigit, isCheckDigitValid } from '../gs1/checkDigit'
import { SchemeSelect } from './EpcParts'
import { Dropdown } from './Dropdown'
import { useMotion, gsap } from '../motion'
import { t } from '../i18n'

export type EncoderState = { keyId: string; values: Record<string, string>; extras: Ai[] }

type Props = {
  mode: Mode
  setMode: (m: Mode) => void
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

const DECODE_SAMPLES: { label: string; text: string }[] = [
  { label: 'SGTIN-96 (hex)', text: '3035E85B4837754000003039' },
  { get label() { return t('SGTIN-96 (binario)') }, text: '0011 0000 0011 0101 1110 1000 0101 1011 0100 1000 0011 0111 0111 0101 0100 0000 0000 0000 0000 0000 0011 0000 0011 1001' },
  { get label() { return t('SGTIN+ con lotto e scadenza') }, text: 'F790800123456789705181C883216727D8B9BCF8' },
  { get label() { return t('SGTIN++ con dominio') }, text: 'FD90800123456789705181CC7419F9B1D3D2E083216727D8B9BCF8' },
  { label: 'EPC Tag URI', text: 'urn:epc:tag:sscc-96:0.8001234.3000000001' },
  { label: 'GS1 Digital Link', text: 'https://id.gs1.org/01/08001234567897/10/LOT42/21/ABC123?17=271231' },
  { label: 'Element string', text: '(01)08001234567897(17)271231(10)LOT42(21)12345' },
]

export function InputPanel(p: Props) {
  const { mode, setMode, encoder, setEncoder, params, setParams, analysis } = p
  const scope = useRef<HTMLElement>(null)
  const key = keyType(encoder.keyId)!
  const family = mode === 'decode' ? (analysis?.key?.id ?? null) : key.id
  const schemes = family ? SCHEMES_BY_FAMILY[family] : []
  const kind = p.scheme ? kindOf(p.scheme) : null

  useMotion(scope, () => {
    gsap.from('.ga-in', { y: 14, opacity: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out' })
  }, [mode, encoder.keyId])

  const setValue = (ai: string, value: string) => setEncoder({ ...encoder, values: { ...encoder.values, [ai]: value } })
  const chooseKey = (id: string) => {
    setEncoder({ keyId: id, values: {}, extras: [] })
    setParams({ ...params, filter: id === 'sgtin' ? 1 : 0, gcpLength: null })
  }
  const useExample = () =>
    setEncoder({ ...encoder, values: Object.fromEntries(key.example.map((a) => [a.ai, a.value])), extras: key.id === 'sgtin' ? EXAMPLE_EXTRAS : [] })
  const setExtra = (i: number, patch: Partial<Ai>) => setEncoder({ ...encoder, extras: encoder.extras.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const addExtra = () => {
    const next = EXTRA_AIS.find((x) => !encoder.extras.some((e) => e.ai === x.ai) && !key.fields.some((f) => f.ai === x.ai))
    setEncoder({ ...encoder, extras: [...encoder.extras, { ai: next?.ai ?? '', value: '' }] })
  }

  return (
    <section className="card input-panel" ref={scope}>
      <div className="mode-switch" role="tablist">
        <button role="tab" aria-selected={mode === 'encode'} className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>
          <PenLine size={18} /> {t('Codifica')}
        </button>
        <button role="tab" aria-selected={mode === 'decode'} className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>
          <ScanLine size={18} /> {t('Decodifica')}
        </button>
      </div>

      {mode === 'encode' ? (
        <div className="encoder">
          <div className="field-group ga-in">
            <label className="group-label" htmlFor="key-type">
              <span className="step-dot">1</span> {t('Che cosa vuoi identificare?')}
            </label>
            <Dropdown id="key-type" value={encoder.keyId} onChange={chooseKey} options={KEY_TYPES.map((k) => ({ value: k.id, label: k.name, detail: k.description, aside: <span className="kind kind-legacy">{k.short}</span> }))} />
            <p className="key-desc">{key.description}</p>
          </div>

          <div className="field-group ga-in">
            <div className="group-row">
              <span className="group-label">
                <span className="step-dot">2</span> {t('I dati della chiave')}
              </span>
              <button className="text-btn" onClick={useExample}>
                <Sparkles size={14} /> {t('Usa un esempio')}
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
                  <label className="field" key={f.ai}>
                    <span className="field-label">
                      <span className="ai-tag">AI {f.ai}</span> {f.label}
                      {f.optional && <em> · {t('facoltativo')}</em>}
                    </span>
                    <div className="input-row">
                      <input className="mono" value={value} placeholder={f.placeholder} spellCheck={false} autoComplete="off" onChange={(e) => setValue(f.ai, e.target.value.trim())} />
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

          <div className="field-group ga-in">
            <span className="group-label">
              <span className="step-dot">3</span> {t('Dati aggiuntivi')} <span className="muted">{t('facoltativi')}</span>
            </span>
            <p className="key-desc tight">{t('Lotto, scadenza e altri AI: entrano negli schemi + e ++, nei barcode 2D e nel GS1 Digital Link.')}</p>
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
        <div className="decoder ga-in">
          <label className="group-label" htmlFor="decode-input">
            {t('Incolla qualsiasi rappresentazione GS1')}
          </label>
          <textarea
            id="decode-input"
            className="mono"
            rows={3}
            value={p.decodeText}
            spellCheck={false}
            placeholder={t('EPC letto dal tag in esadecimale o binario, urn:epc:…, https://id.gs1.org/01/…, (01)…(21)…, dati del lettore o un GTIN')}
            onChange={(e) => p.setDecodeText(e.target.value)}
          />
          <div className="samples">
            <span className="muted small">{t('Prova:')}</span>
            {DECODE_SAMPLES.map((s) => (
              <button key={s.label} className="chip" onClick={() => p.setDecodeText(s.text)}>
                {s.label}
              </button>
            ))}
          </div>
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
        <div className="field-group tag-params ga-in">
          <label className="group-label" htmlFor="tag-type">
            {mode === 'encode' && <span className="step-dot">4</span>} {t('Il tag RFID')}
          </label>
          <span className="field-label">{t('Tipo di tag (schema EPC)')}</span>
          <SchemeSelect id="tag-type" schemes={schemes} results={analysis?.results ?? []} scheme={p.scheme} onScheme={p.setScheme} />
          <div className="params">
            <label className="field">
              <span className="field-label">Filter value</span>
              <Dropdown ariaLabel="Filter value" value={String(params.filter)} onChange={(v) => setParams({ ...params, filter: Number(v) })} options={filterOptions(familyOf(family!)).map((o) => ({ value: String(o.value), label: o.label }))} />
              <span className="hint">{t('Aiuta i lettori a selezionare solo certi tag.')}</span>
            </label>
            {kind === 'legacy' && (
              <div className="field">
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
