import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowUpRight, Barcode, BadgeCheck, ChevronDown, PenLine, RotateCw, Route, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Alert, AlertDescription, AlertTitle, Kbd, TooltipProvider } from '@/components/ui/misc'
import logo from './assets/gs1-italy-logo.png'
import { analyzeDecode, analyzeEncode, type Analysis, type Params } from './gs1/analyze'
import { KEY_TYPES, SCHEMES_BY_FAMILY, keyType, type Ai } from './gs1/schemes'
import { canVerify, verifyKey, type Verification } from './gs1/vbg'
import { InputPanel, withExample, type EncoderState } from './components/InputPanel'
import { Journey } from './components/Journey'
import { Formats } from './components/Formats'
import { TagMemory } from './components/TagMemory'
import { Carriers } from './components/Carriers'
import { VbgCard } from './components/VbgCard'
import { Readout } from './components/Readout'
import { StartPanel } from './components/StartPanel'
import { t, useLang } from './i18n'
import { LangSwitch } from './components/LangSwitch'
import { readUrlState, writeUrlState, type Tab } from './urlState'
import { issuesOf, type IssueAction, type MissingField } from './issues'
import { flash, intro } from './motion'
import { Section, Sections, type Tone } from './components/Section'
import { DigitalLinkIcon, MemoryIcon } from './components/Art'
import { epcBank, hexWord } from './gs1/rfid'
import { CARRIERS } from './gs1/barcodes'

export type Mode = 'encode' | 'decode'

const SECTIONS: { id: Tab; label: string; icon: (p: { size?: number }) => ReactNode; tone: Tone }[] = [
  { id: 'journey', get label() { return t('Passo per passo') }, icon: Route, tone: 'blue' },
  { id: 'rfid', get label() { return t('Memoria del tag') }, icon: MemoryIcon, tone: 'teal' },
  { id: 'barcode', get label() { return t('Barcode e QR') }, icon: Barcode, tone: 'forest' },
  { id: 'formats', get label() { return t('Tutti i formati') }, icon: DigitalLinkIcon, tone: 'teal' },
  { id: 'vbg', label: 'Verified by GS1', icon: BadgeCheck, tone: 'blue' },
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
    if (f.ai === '01' && /^(?:\d{8}|\d{12,13})$/.test(value)) value = value.padStart(14, '0')
    return { ai: f.ai, value }
  })
  return [...key, ...e.extras.map((x) => ({ ai: x.ai.trim(), value: x.value.trim() }))].filter((a) => a.ai && a.value)
}

/** Schema proposto: il primo + della chiave (porta anche i dati aggiuntivi senza partizione). */
const defaultScheme = (family: string) => SCHEMES_BY_FAMILY[family]?.find((s) => s.endsWith('+')) ?? SCHEMES_BY_FAMILY[family]?.[0] ?? null

/** Il campo su cui si scrive: testo da decodificare o primo dato della chiave. */
const isEditable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export default function App() {
  // Al cambio di lingua si ridisegna tutto e si rifà l'analisi (i testi dei campi del tag nascono lì).
  const language = useLang()
  const initial = useMemo(() => readUrlState(emptyEncoder), [])
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [encoder, setEncoder] = useState<EncoderState>(initial.encoder)
  const [decodeText, setDecodeText] = useState(initial.decodeText)
  const [params, setParams] = useState<Params>({ filter: 1, hostname: 'id.gs1.org', gcpLength: null, ...initial.params })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [open, setOpen] = useState<Tab[]>(initial.open)
  const [scheme, setScheme] = useState<string | null>(initial.scheme)
  const [vbg, setVbg] = useState<{ id: string; result: Verification | null } | null>(null)

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
      try {
        const a = mode === 'encode' ? await analyzeEncode(ais, params, vbgGcp) : await analyzeDecode(decodeText, params, vbgGcp)
        if (!alive) return
        setAnalysis(a)
        setLoadError(false)
      } catch (e) {
        // Motori non caricati (rete) o errore imprevisto: lo si dice e si offre di riprovare.
        if (!alive) return
        console.error(e)
        setLoadError(true)
      } finally {
        if (alive) setBusy(false)
      }
    }, 180)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [mode, ais, decodeText, params, vbgPrefix, vbgPending, language, retry])

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

  // Campi obbligatori della chiave ancora vuoti, quando l'utente ha già iniziato a scrivere.
  const missing = useMemo<MissingField[]>(() => {
    if (mode !== 'encode') return []
    const k = keyType(encoder.keyId)!
    const started = k.fields.some((f) => (encoder.values[f.ai] ?? '').trim()) || encoder.extras.some((x) => x.value.trim())
    return started ? k.fields.filter((f) => !f.optional && !(encoder.values[f.ai] ?? '').trim()).map((f) => ({ ai: f.ai, label: f.label })) : []
    // Le etichette sono getter tradotti: cambiano con la lingua.
  }, [mode, encoder, language])
  const issues = useMemo(() => (analysis ? issuesOf(analysis, active, mode, missing) : []), [analysis, active, mode, missing])

  const onAction = (a: IssueAction) => {
    if ('scheme' in a) return setScheme(a.scheme)
    const el = document.getElementById(a.focus) ?? (a.focus.startsWith('ai-') ? document.querySelector<HTMLElement>('.key-fields input') : null)
    if (!el) return
    el.focus({ preventScroll: true })
    // Sui monitor larghi la colonna dei dati scorre da sola: si porta il campo al centro di quella, non della pagina.
    const pane = el.closest<HTMLElement>('.pane-input')
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (pane && pane.scrollHeight > pane.clientHeight && getComputedStyle(pane).position === 'sticky') {
      const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - pane.clientHeight / 2
      pane.scrollTo({ top, behavior })
    } else el.scrollIntoView({ block: 'center', behavior })
    flash(el.closest('.field, .decoder') ?? el)
  }

  // Entrata della pagina, una sola volta.
  const appRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => intro(appRef.current), [])

  // Lo stato resta nell'indirizzo: un tag decodificato si condivide con un link.
  useEffect(() => {
    const timer = setTimeout(() => writeUrlState({ mode, encoder, decodeText, params, scheme, open }), 300)
    return () => clearTimeout(timer)
  }, [mode, encoder, decodeText, params, scheme, open])

  // Incolla in qualsiasi punto della pagina: si decodifica. "/" porta al campo di input.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return
      const text = e.clipboardData?.getData('text')?.trim()
      if (!text) return
      e.preventDefault()
      setMode('decode')
      setDecodeText(text)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return
      e.preventDefault()
      ;(mode === 'decode' ? document.getElementById('decode-input') : document.querySelector<HTMLElement>('.key-fields input'))?.focus()
    }
    document.addEventListener('paste', onPaste)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('keydown', onKey)
    }
  }, [mode])

  const openInEncoder = () => {
    if (!analysis?.key) return
    const k = analysis.key
    setEncoder({
      keyId: k.id,
      values: Object.fromEntries(k.fields.map((f) => [f.ai, analysis.ais.find((a) => a.ai === f.ai)?.value ?? ''])),
      extras: analysis.ais.filter((a) => !k.fields.some((f) => f.ai === a.ai)),
    })
    setParams((p) => ({ ...p, filter: analysis.params.filter, hostname: analysis.params.hostname, gcpLength: analysis.gcp.source === 'tag' ? analysis.gcp.length : p.gcpLength }))
    if (analysis.sourceScheme) setScheme(analysis.sourceScheme)
    setMode('encode')
  }

  const toggle = (id: Tab) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  /** Apre una sezione (es. dal riepilogo) e ci porta la pagina. */
  const reveal = (id: Tab) => {
    setOpen((o) => (o.includes(id) ? o : [...o, id]))
    requestAnimationFrame(() => document.getElementById(`sec-${id}`)?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
  }

  // Reimposta: svuota i dati del modo corrente e riporta tag e parametri ai valori iniziali.
  const canReset =
    (mode === 'encode' ? Object.values(encoder.values).some((v) => v.trim()) || encoder.extras.length > 0 : decodeText.trim() !== '') ||
    scheme !== null ||
    params.gcpLength !== null ||
    params.hostname !== 'id.gs1.org'
  const reset = () => {
    if (mode === 'encode') setEncoder({ keyId: encoder.keyId, values: {}, extras: [] })
    else setDecodeText('')
    setParams({ filter: mode === 'encode' && encoder.keyId !== 'sgtin' ? 0 : 1, hostname: 'id.gs1.org', gcpLength: null })
    setScheme(null)
    requestAnimationFrame(() => (mode === 'decode' ? document.getElementById('decode-input') : document.querySelector<HTMLElement>('.key-fields input'))?.focus())
  }

  const loadInDecoder = (text: string) => {
    setDecodeText(text)
    setMode('decode')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <TooltipProvider>
    <div className="app" ref={appRef}>
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} title={t('Ricomincia da capo')}>
          <img src={logo} alt="GS1 Italy" width={46} height={31} />
          <span className="brand-name">{t('EPC Encoder / Decoder')}</span>
        </a>
        <ModeSwitch mode={mode} setMode={setMode} />
        <p className="topbar-hint">
          {t('Incolla un EPC ovunque per decodificarlo')} <Kbd>Ctrl</Kbd> <Kbd>V</Kbd>
        </p>
        <LangSwitch />
      </header>

      <div className="workbench">
        <aside className="pane-input">
          <InputPanel
            mode={mode}
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
            onReset={reset}
            canReset={canReset}
          />
        </aside>

        <main className="pane-results" id="results" aria-busy={busy}>
          {loadError && (
            <Alert variant="destructive" role="alert">
              <AlertTriangle />
              <AlertTitle>{t('Non è stato possibile caricare i motori GS1. Controlla la connessione e riprova.')}</AlertTitle>
              <AlertDescription>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setRetry((n) => n + 1)}>
                  <RotateCw /> {t('Riprova')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {hasData && analysis ? (
            <>
              <Readout analysis={analysis} scheme={active} busy={busy} vbg={vbgState} issues={issues} onAction={onAction} onTab={(x) => reveal(x as Tab)} />
              {analysis.gs1 && (
                <Sections title={t('Dettagli')}>
                  {SECTIONS.map(({ id, label, icon: Icon, tone }) => (
                    <Section key={id} id={id} tone={tone} icon={<Icon size={18} />} title={label} summary={summaryOf(id, analysis, active, vbgState)} open={open.includes(id)} onToggle={() => toggle(id)}>
                      {id === 'journey' && <Journey analysis={analysis} scheme={active} onScheme={setScheme} />}
                      {id === 'rfid' && <TagMemory analysis={analysis} scheme={active} onScheme={setScheme} />}
                      {id === 'barcode' && <Carriers data={analysis.gs1!} />}
                      {id === 'formats' && <Formats analysis={analysis} onDecode={loadInDecoder} />}
                      {id === 'vbg' && <VbgCard ai={primary?.ai} state={vbgState} />}
                    </Section>
                  ))}
                </Sections>
              )}
            </>
          ) : (
            <StartPanel mode={mode} onSample={loadInDecoder} onExample={() => setEncoder(withExample(encoder))} />
          )}
        </main>
      </div>

      <footer className="footer">
        <div className="footer-row">
          <img src={logo} alt="GS1 Italy" width={46} height={31} />
          <p>{t('Strumento dimostrativo: per l’uso in produzione fanno fede gli standard GS1.')}</p>
          <a className="footer-site" href="https://gs1it.org" target="_blank" rel="noreferrer">
            {t('Vai al sito di GS1 Italy')} <ArrowUpRight size={15} />
          </a>
        </div>
        <details className="footer-more">
          <summary>
            {t('Standard, servizi e strumenti GS1')} <ChevronDown size={15} />
          </summary>
          <div className="footer-cols">
            <LinkList title={t('Standard di riferimento')} links={STANDARDS} />
            <LinkList title={t('Servizi GS1 Italy')} links={SERVICES} />
            <LinkList title={t('Strumenti GS1')} links={ENGINES} />
          </div>
        </details>
        <address className="footer-address">
          © {new Date().getFullYear()} GS1 Italy · Via Paleocapa 7, 20121 {t('Milano')}
        </address>
      </footer>
    </div>
    </TooltipProvider>
  )
}

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label={t('Modalità')} className="mode-switch">
      <ToggleGroupItem value="encode" className="h-9 px-4">
        <PenLine /> {t('Codifica')}
      </ToggleGroupItem>
      <ToggleGroupItem value="decode" className="h-9 px-4">
        <ScanLine /> {t('Decodifica')}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/** Riassunto di una riga di ogni sezione, visibile anche a sezione chiusa. */
function summaryOf(id: Tab, analysis: Analysis, scheme: string | null, vbg?: Verification | 'loading'): string {
  const r = analysis.results.find((x) => x.scheme === scheme)
  const ok = r?.ok ? r : null
  switch (id) {
    case 'journey':
      return analysis.gs1?.elementString ?? ''
    case 'rfid': {
      if (!ok) return analysis.rfidNote ?? t('Nessun EPC')
      const bank = epcBank(ok.bits)
      return t('{bits} bit nel banco EPC · CRC {crc}h · PC {pc}h', { bits: bank.words.length * 16, crc: hexWord(bank.crc), pc: hexWord(bank.pc.bits) })
    }
    case 'barcode':
      return t('{n} simboli: {names}…', { n: CARRIERS.length, names: CARRIERS.slice(0, 3).map((c) => c.name).join(', ') })
    case 'formats':
      return t('{ok} schemi EPC su {total} codificabili', { ok: analysis.results.filter((x) => x.ok).length, total: analysis.results.length })
    case 'vbg':
      return !vbg
        ? t('Non disponibile per questa chiave')
        : vbg === 'loading'
          ? t('Verifica in corso…')
          : vbg.state === 'verified'
            ? (vbg.name ?? t('Verificato'))
            : vbg.state === 'licensed'
              ? (vbg.licensee?.name ?? t('Licenza trovata'))
              : (vbg.message ?? t('Non disponibile'))
  }
}

function LinkList({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
