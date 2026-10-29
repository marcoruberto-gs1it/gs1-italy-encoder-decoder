import { useEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion, useMotion } from '../motion'
import { t } from '../i18n'
import { BarsGlyph, Modules, QrGlyph, TagGlyph } from './Illustrations'

/*
 * Infografica iniziale: un EPC (GTIN + seriale) come chiave e le sue rappresentazioni.
 * I valori sono quelli reali in SGTIN-96 di un GTIN sul prefisso di GS1 Italy (8000000, 7 cifre; filter 1), verificati in render.test.tsx.
 * Le parti della chiave hanno lo stesso colore in ogni forma: l'animazione le evidenzia a turno in tutte.
 */

type Part = 'ind' | 'gcp' | 'ref' | 'cd' | 'ser' | 'hdr' | 'flt' | 'par'

const P = ({ p, children }: { p: Part; children: ReactNode }) => <span className={`hp hp-${p}`}>{children}</span>

/** Campi del binario SGTIN-96 dell'esempio (3035E8480000004000003039). */
const BITS: [Part, string][] = [
  ['hdr', '00110000'],
  ['flt', '001'],
  ['par', '101'],
  ['gcp', '011110100001001000000000'],
  ['ref', '00000000000000000001'],
  ['ser', '00000000000000000000000011000000111001'],
]

const PARTS: { p: Part; label: string }[] = [
  { p: 'gcp', label: 'GS1 Company Prefix · 8000000 (GS1 Italy)' },
  { p: 'ref', get label() { return t('Item Reference · 00001 (con l’indicatore 0)') } },
  { p: 'ser', get label() { return t('Numero di serie · 12345') } },
]

type Row = { id: string; name: string; note: string; icon: ReactNode; value: ReactNode }

const icon = (children: ReactNode, viewBox = '0 0 40 40') => (
  <svg viewBox={viewBox} aria-hidden>
    {children}
  </svg>
)

const ROWS: Row[] = [
  {
    id: 'pure',
    name: 'EPC Pure Identity URI',
    get note() { return t('L’identità, per i sistemi informativi ed EPCIS') },
    icon: icon(<text x="20" y="25" textAnchor="middle" fontSize="12" fontWeight="800" fill="#002c6c" fontFamily="Montserrat, sans-serif">urn</text>),
    value: (
      <>
        urn:epc:id:sgtin:<P p="gcp">8000000</P>.<P p="ind">0</P>
        <P p="ref">00001</P>.<P p="ser">12345</P>
      </>
    ),
  },
  {
    id: 'tag',
    name: 'EPC Tag URI',
    get note() { return t('Aggiunge schema e filter value del tag') },
    icon: icon(<text x="20" y="25" textAnchor="middle" fontSize="12" fontWeight="800" fill="#f26334" fontFamily="Montserrat, sans-serif">tag</text>),
    value: (
      <>
        urn:epc:tag:sgtin-96:<P p="flt">1</P>.<P p="gcp">8000000</P>.<P p="ind">0</P>
        <P p="ref">00001</P>.<P p="ser">12345</P>
      </>
    ),
  },
  {
    id: 'bin',
    get name() { return t('Binario nel tag RFID') },
    get note() { return t('96 bit nel banco EPC: header, filter, partizione, poi la chiave') },
    icon: icon(<TagGlyph x={1} y={10} w={38} h={20} />),
    value: (
      <span className="hero-bits">
        {BITS.map(([p, b]) => (
          <P key={p} p={p}>
            {b}
          </P>
        ))}
      </span>
    ),
  },
  {
    id: 'hex',
    get name() { return t('Esadecimale') },
    get note() { return t('Lo stesso binario, come lo leggono i lettori RFID') },
    icon: icon(<text x="20" y="25" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1d4f9a" fontFamily="'Spline Sans Mono', monospace">0x</text>),
    value: <>3035E8480000004000003039</>,
  },
  {
    id: 'dl',
    name: 'GS1 Digital Link URI',
    get note() { return t('Lo stesso EPC sul web, in un QR Code') },
    icon: icon(<QrGlyph x={6} y={6} size={28} />),
    value: (
      <>
        https://id.gs1.org/01/<P p="ind">0</P>
        <P p="gcp">8000000</P>
        <P p="ref">00001</P>
        <P p="cd">9</P>/21/<P p="ser">12345</P>
      </>
    ),
  },
  {
    id: 'es',
    get name() { return t('Element string GS1') },
    get note() { return t('Nei barcode GS1-128 e GS1 DataMatrix') },
    icon: icon(
      <>
        <BarsGlyph x={4} y={8} w={18} h={24} count={7} seed={8} />
        <Modules x={24} y={12} size={14} cells={7} seed={6} />
      </>,
    ),
    value: (
      <>
        (01)<P p="ind">0</P>
        <P p="gcp">8000000</P>
        <P p="ref">00001</P>
        <P p="cd">9</P>(21)<P p="ser">12345</P>
      </>
    ),
  },
]

export function HeroEpc() {
  const scope = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLSpanElement>(null)

  useMotion(scope, (m) => {
    const key = m.from('.he-key', { y: 16, scale: 0.92, opacity: 0 }, { duration: 0.6, ease: 'back' })
    m.from('.he-key .hp', { y: 8, opacity: 0 }, { duration: 0.3, stagger: 0.06, at: key - 0.25 })
    m.from('.he-bus', { scaleY: 0, origin: '50% 0%' }, { duration: 0.6, at: key - 0.1, ease: 'inOut' })
    m.from('.he-row', { x: 18, opacity: 0 }, { duration: 0.4, stagger: 0.08, at: key })
  })

  // A turno, la stessa parte della chiave si accende in tutte le forme (il segnale lungo il bus è in CSS).
  useEffect(() => {
    if (prefersReducedMotion()) return
    const steps = [...PARTS.map((p) => ({ part: p.p as string | null, caption: () => p.label })), { part: null, caption: () => t('Tutte le forme portano la stessa chiave') }]
    let i = 0
    const tick = () => {
      const step = steps[i++ % steps.length]
      if (caption.current) caption.current.textContent = step.caption()
      if (step.part) scope.current?.setAttribute('data-part', step.part)
      else scope.current?.removeAttribute('data-part')
    }
    let timer: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      tick()
      timer = setInterval(tick, 2000)
    }, 1400)
    return () => {
      clearTimeout(start)
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="hero-epc" ref={scope}>
      <div className="he-key">
        <span className="he-eyebrow">EPC · Electronic Product Code</span>
        <span className="he-digits mono">
          <P p="ind">0</P>
          <P p="gcp">8000000</P>
          <P p="ref">00001</P>
          <P p="cd">9</P>
          <span className="he-plus">+</span>
          <P p="ser">12345</P>
        </span>
        <span className="he-legend">
          <span>
            <i className="hp-ind" />
            {t('indicatore')}
          </span>
          <span>
            <i className="hp-gcp" />
            Company Prefix
          </span>
          <span>
            <i className="hp-ref" />
            Item Reference
          </span>
          <span>
            <i className="hp-cd" />
            {t('cifra di controllo')}
          </span>
          <span>
            <i className="hp-ser" />
            {t('seriale')}
          </span>
        </span>
        <span className="he-caption" ref={caption}>
          {t('GTIN + numero di serie: un oggetto, un identificativo')}
        </span>
      </div>

      <div className="he-forms">
        <span className="he-bus" aria-hidden>
          <span className="he-pulse" />
        </span>
        {ROWS.map((r) => (
          <div className="he-row" key={r.id}>
            <span className="he-icon">{r.icon}</span>
            <span className="he-text">
              <span className="he-name">
                {r.name} <small>{r.note}</small>
              </span>
              <span className="he-value mono">{r.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
