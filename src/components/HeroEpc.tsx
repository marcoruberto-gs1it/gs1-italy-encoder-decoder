import { useRef, type ReactNode } from 'react'
import { useMotion, gsap } from '../motion'
import { t } from '../i18n'
import { BarsGlyph, Modules, QrGlyph, TagGlyph } from './Illustrations'

/*
 * Infografica iniziale: un EPC (GTIN + seriale) come chiave e le sue rappresentazioni.
 * I valori sono quelli reali dell'esempio in SGTIN-96 (GCP di 7 cifre, filter 1), verificati in epc.test.ts.
 * Le parti della chiave hanno lo stesso colore in ogni forma: l'animazione le evidenzia a turno in tutte.
 */

type Part = 'ind' | 'gcp' | 'ref' | 'cd' | 'ser' | 'hdr' | 'flt' | 'par'

const P = ({ p, children }: { p: Part; children: ReactNode }) => <span className={`hp hp-${p}`}>{children}</span>

/** Campi del binario SGTIN-96 dell'esempio (3035E85B4837754000003039). */
const BITS: [Part, string][] = [
  ['hdr', '00110000'],
  ['flt', '001'],
  ['par', '101'],
  ['gcp', '011110100001011011010010'],
  ['ref', '00001101110111010101'],
  ['ser', '00000000000000000000000011000000111001'],
]

const PARTS: { p: Part; label: string }[] = [
  { p: 'gcp', label: 'GS1 Company Prefix · 8001234' },
  { p: 'ref', get label() { return t('Item Reference · 56789 (con l’indicatore 0)') } },
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
        urn:epc:id:sgtin:<P p="gcp">8001234</P>.<P p="ind">0</P>
        <P p="ref">56789</P>.<P p="ser">12345</P>
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
        urn:epc:tag:sgtin-96:<P p="flt">1</P>.<P p="gcp">8001234</P>.<P p="ind">0</P>
        <P p="ref">56789</P>.<P p="ser">12345</P>
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
    value: <>3035E85B4837754000003039</>,
  },
  {
    id: 'dl',
    name: 'GS1 Digital Link URI',
    get note() { return t('Lo stesso EPC sul web, in un QR Code') },
    icon: icon(<QrGlyph x={6} y={6} size={28} />),
    value: (
      <>
        https://id.gs1.org/01/<P p="ind">0</P>
        <P p="gcp">8001234</P>
        <P p="ref">56789</P>
        <P p="cd">7</P>/21/<P p="ser">12345</P>
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
        <P p="gcp">8001234</P>
        <P p="ref">56789</P>
        <P p="cd">7</P>(21)<P p="ser">12345</P>
      </>
    ),
  },
]

export function HeroEpc() {
  const scope = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLSpanElement>(null)

  useMotion(scope, () => {
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .from('.he-key', { y: 16, scale: 0.92, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' })
      .from('.he-key .hp', { y: 8, opacity: 0, duration: 0.3, stagger: 0.06 }, '-=0.25')
      .from('.he-bus', { scaleY: 0, transformOrigin: '50% 0%', duration: 0.6, ease: 'power2.inOut' }, '-=0.1')
      .from('.he-row', { x: 18, opacity: 0, duration: 0.4, stagger: 0.08 }, '-=0.45')

    // Il segnale scende lungo il bus verso le forme.
    gsap.fromTo('.he-pulse', { top: '0%', opacity: 0 }, { top: '100%', opacity: 1, duration: 2.2, ease: 'power1.inOut', repeat: -1, repeatDelay: 0.3, delay: 1.2 })

    // A turno, la stessa parte della chiave si accende in tutte le forme.
    const cycle = gsap.timeline({ repeat: -1, delay: 1.4 })
    PARTS.forEach(({ p, label }) => {
      cycle
        .call(() => {
          if (caption.current) caption.current.textContent = label
          scope.current?.setAttribute('data-part', p)
        })
        .fromTo(`.hp-${p}`, { scale: 1 }, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, clearProps: 'none' })
        .to({}, { duration: 1.6 })
    })
    cycle.call(() => {
      if (caption.current) caption.current.textContent = t('Tutte le forme portano la stessa chiave')
      scope.current?.removeAttribute('data-part')
    })
    cycle.to({}, { duration: 1.4 })
  })

  return (
    <div className="hero-epc" ref={scope}>
      <div className="he-key">
        <span className="he-eyebrow">EPC · Electronic Product Code</span>
        <span className="he-digits mono">
          <P p="ind">0</P>
          <P p="gcp">8001234</P>
          <P p="ref">56789</P>
          <P p="cd">7</P>
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
