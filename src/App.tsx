import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Barcode, BadgeCheck, Cpu, FileCode2, Route } from 'lucide-react'
import logo from './assets/gs1-italy-logo.png'
import { analyzeDecode, analyzeEncode, type Analysis, type Params } from './gs1/analyze'
import { KEY_TYPES, SCHEMES_BY_FAMILY, keyType, type Ai } from './gs1/schemes'
import { canVerify, verifyKey, type Verification } from './gs1/vbg'
import { InputPanel, type EncoderState } from './components/InputPanel'
import { Journey } from './components/Journey'
import { Formats } from './components/Formats'
import { TagMemory } from './components/TagMemory'
import { Carriers } from './components/Carriers'
import { VbgCard } from './components/VbgCard'
import { Summary } from './components/Summary'
import { Pipeline } from './components/Pipeline'
import { HeroEpc } from './components/HeroEpc'
import { useMotion } from './motion'
import { t, useLang } from './i18n'
import { LangSwitch } from './components/LangSwitch'

export type Mode = 'encode' | 'decode'
type Tab = 'journey' | 'formats' | 'rfid' | 'barcode' | 'vbg'

const TABS: { id: Tab; label: string; icon: typeof Route }[] = [
  { id: 'journey', get label() { return t('Percorso') }, icon: Route },
  { id: 'rfid', label: 'Tag RFID', icon: Cpu },
  { id: 'barcode', get label() { return t('Barcode e QR') }, icon: Barcode },
  { id: 'formats', get label() { return t('Tutti i formati') }, icon: FileCode2 },
  { id: 'vbg', label: 'Verified by GS1', icon: BadgeCheck },
]

const STANDARDS = [
  { label: 'EPC Tag Data Standard (TDS) 2.3', href: 'https://ref.gs1.org/standards/tds/' },
  { label: 'EPC Tag Data Translation (TDT) 2.3', href: 'https://ref.gs1.org/standards/tdt/' },
  { label: 'GS1 General Specifications', href: 'https://ref.gs1.org/standards/genspecs/' },
  { label: 'GS1 Digital Link', href: 'https://ref.gs1.org/standards/digital-link/' },
  { get label() { return t('Application Identifier GS1') }, href: 'https://ref.gs1.org/ai/' },
]

const SERVICES = [
  { get label() { return t('Calcola la cifra di controllo') }, href: 'https://gs1it.org/assistenza/calcolo-cifra-di-controllo/' },
  { label: 'Verified by GS1', href: 'https://gs1it.org/servizi/verified-by-gs1/' },
  { get label() { return t('Ti serve un barcode GS1') }, href: 'https://gs1it.org/serve-codice-a-barre/' },
  { label: 'FAQ', href: 'https://gs1it.org/assistenza/faq/' },
]

const ENGINES = [
  { get label() { return t('GS1 TDT 2.3 (motore di traduzione)') }, href: 'https://github.com/gs1/TDT' },
  { label: 'GS1 Barcode Syntax Engine', href: 'https://github.com/gs1/gs1-syntax-engine' },
]

const emptyEncoder: EncoderState = { keyId: KEY_TYPES[0].id, values: {}, extras: [] }

function encoderAis(e: EncoderState): Ai[] {
  const k = keyType(e.keyId)!
  const key = k.fields.map((f) => {
    let value = (e.values[f.ai] ?? '').trim()
    if (f.ai === '01' && /^\d{8,13}$/.test(value)) value = value.padStart(14, '0')
    return { ai: f.ai, value }
  })
  return [...key, ...e.extras.map((x) => ({ ai: x.ai.trim(), value: x.value.trim() }))].filter((a) => a.ai && a.value)
}

/** Schema proposto: il primo + della chiave (porta anche i dati aggiuntivi senza partizione). */
const defaultScheme = (family: string) => SCHEMES_BY_FAMILY[family]?.find((s) => s.endsWith('+')) ?? SCHEMES_BY_FAMILY[family]?.[0] ?? null

export default function App() {
  // Al cambio di lingua si ridisegna tutto e si rifà l'analisi (i testi dei campi del tag nascono lì).
  const language = useLang()
  const [mode, setMode] = useState<Mode>('encode')
  const [encoder, setEncoder] = useState<EncoderState>(emptyEncoder)
  const [decodeText, setDecodeText] = useState('')
  const [params, setParams] = useState<Params>({ filter: 1, hostname: 'id.gs1.org', gcpLength: null })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('journey')
  const [scheme, setScheme] = useState<string | null>(null)
  const [vbg, setVbg] = useState<{ id: string; result: Verification | null } | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const ais = useMemo(() => encoderAis(encoder), [encoder])
  const primary = analysis?.ais[0]
  const vbgId = primary && canVerify(primary.ai) && !analysis?.error ? `${primary.ai}:${primary.value}` : null
  const vbgPrefix = vbg?.id === vbgId ? vbg?.result?.licensee?.prefix : undefined
  const vbgState = vbgId ? (vbg?.id === vbgId ? (vbg?.result ?? 'loading') : 'loading') : undefined
  const vbgPending = vbgState === 'loading'

  // Analisi (con un breve ritardo mentre si scrive).
  useEffect(() => {
    let alive = true
    setBusy(true)
    const timer = setTimeout(async () => {
      const vbgGcp = { prefix: vbgPrefix, pending: vbgPending }
      const a = mode === 'encode' ? await analyzeEncode(ais, params, vbgGcp) : await analyzeDecode(decodeText, params, vbgGcp)
      if (!alive) return
      setAnalysis(a)
      setBusy(false)
    }, 180)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [mode, ais, decodeText, params, vbgPrefix, vbgPending, language])

  // Verified by GS1 per la chiave primaria (fornisce anche la lunghezza del GS1 Company Prefix).
  useEffect(() => {
    // Dipende solo dalla chiave: se dipendesse anche dallo stato, aggiornarlo annullerebbe la richiesta in attesa.
    if (!vbgId) return
    const i = vbgId.indexOf(':')
    let alive = true
    const timer = setTimeout(() => {
      void verifyKey(vbgId.slice(0, i), vbgId.slice(i + 1)).then((result) => alive && setVbg({ id: vbgId, result }))
    }, 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [vbgId])

  // Tipo di tag: quello scelto se appartiene alla chiave, altrimenti quello letto nel decoder o il primo +.
  const family = mode === 'encode' ? encoder.keyId : (analysis?.key?.id ?? null)
  const familySchemes = family ? (SCHEMES_BY_FAMILY[family] ?? []) : []
  const active = scheme && familySchemes.includes(scheme) ? scheme : mode === 'decode' && analysis?.sourceScheme ? analysis.sourceScheme : family ? defaultScheme(family) : null

  const hasData = Boolean(analysis && (analysis.ais.length > 0 || analysis.error))

  useMotion(heroRef, (m) => {
    m.from('.hero-copy > *', { y: 16, opacity: 0 }, { duration: 0.55, stagger: 0.08 })
  }, [hasData])

  const openInEncoder = () => {
    if (!analysis?.key) return
    const k = analysis.key
    setEncoder({
      keyId: k.id,
      values: Object.fromEntries(k.fields.map((f) => [f.ai, analysis.ais.find((a) => a.ai === f.ai)?.value ?? ''])),
      extras: analysis.ais.filter((a) => !k.fields.some((f) => f.ai === a.ai)),
    })
    setParams((p) => ({ ...p, filter: analysis.params.filter, hostname: analysis.params.hostname }))
    setMode('encode')
  }

  const loadInDecoder = (text: string) => {
    setDecodeText(text)
    setMode('decode')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo-btn">
          <a href={import.meta.env.BASE_URL} title={t('Ricomincia da capo')} aria-label={t('GS1 Italy: ricarica la pagina')}>
            <img src={logo} alt="GS1 Italy" width={56} height={38} />
          </a>
          <span className="app-name">
            Encoder · Decoder
            <br />
            GS1
          </span>
        </div>
        <LangSwitch />
      </header>

      <main>
        <div className="top-grid">
          <InputPanel
            mode={mode}
            setMode={setMode}
            encoder={encoder}
            setEncoder={setEncoder}
            decodeText={decodeText}
            setDecodeText={setDecodeText}
            params={params}
            setParams={setParams}
            analysis={analysis}
            scheme={active}
            setScheme={setScheme}
            onOpenInEncoder={openInEncoder}
          />

          <div className="side" ref={heroRef}>
            {hasData && analysis ? (
              <Summary analysis={analysis} busy={busy} vbg={vbgState} onTab={(t) => setTab(t as Tab)} />
            ) : (
              <section className="card hero">
                <div className="hero-copy">
                  <h1>
                    {t('Un EPC, *tutte* le sue forme.')
                      .split('*')
                      .map((part, i) => (i === 1 ? <em key={i}>{part}</em> : part))}
                  </h1>
                  <p>
                    {mode === 'encode'
                      ? t('L’EPC identifica un singolo oggetto con una chiave GS1, qui un GTIN con il suo numero di serie. La stessa chiave si scrive come URI, in binario nel tag RFID, come GS1 Digital Link o in un barcode: inserisci la tua e guarda ogni passaggio.')
                      : t('Incolla l’EPC letto da un tag, un link o i dati di un barcode: l’app riconosce il formato e ricostruisce tutte le altre rappresentazioni.')}
                  </p>
                </div>
                <HeroEpc />
              </section>
            )}
          </div>
        </div>

        {analysis?.gs1 && hasData && (
          <>
            <Pipeline analysis={analysis} scheme={active} vbg={vbgState} tab={tab} onTab={(t) => setTab(t as Tab)} />
            <section className="results card">
              <div className="tabs" role="tablist">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
                    <Icon size={17} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="tab-body">
                {tab === 'journey' && <Journey analysis={analysis} scheme={active} onScheme={setScheme} />}
                {tab === 'rfid' && <TagMemory analysis={analysis} scheme={active} onScheme={setScheme} />}
                {tab === 'barcode' && <Carriers data={analysis.gs1} />}
                {tab === 'formats' && <Formats analysis={analysis} onDecode={loadInDecoder} />}
                {tab === 'vbg' && <VbgCard ai={primary?.ai} state={vbgState} />}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <div className="footer-top">
          <img className="footer-logo" src={logo} alt="GS1 Italy" width={70} height={48} />
          <p className="footer-claim">The Global Language of Business</p>
        </div>
        <div className="footer-cols">
          <div>
            <h3>{t('Standard di riferimento')}</h3>
            <ul>
              {STANDARDS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{t('Servizi GS1 Italy')}</h3>
            <ul>
              {SERVICES.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{t('Strumenti GS1')}</h3>
            <ul>
              {ENGINES.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <address className="footer-address">
          {t('Strumento dimostrativo: per l’uso in produzione fanno fede gli standard GS1.')}
          <br />
          GS1 Italy · Via Paleocapa 7, 20121 {t('Milano')}
        </address>
        <p className="footer-copy">© {new Date().getFullYear()} GS1 Italy</p>
        <a className="footer-site" href="https://gs1it.org" target="_blank" rel="noreferrer">
          {t('Vai al sito di GS1 Italy')} <ArrowUpRight size={17} />
        </a>
      </footer>
    </div>
  )
}
