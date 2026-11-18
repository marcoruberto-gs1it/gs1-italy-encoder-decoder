/*
 * Icone e illustrazioni vettoriali di dominio (RFID, memoria del tag, GS1 Digital Link), disegnate per
 * l'app nello stile delle icone lucide: griglia 24×24, tratto 1,8, angoli arrotondati, colore dal testo.
 * Le illustrazioni della schermata iniziale usano la palette GS1 Italy e si animano con GSAP.
 */
import { useRef, type SVGProps } from 'react'
import { useMotion } from '../motion'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  )
}

/** Inlay RAIN RFID: antenna a dipolo ripiegata e chip al centro. */
export const RfidTagIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2.5" />
    <path d="M5 12V9h3v6h3v-3M19 12V9h-3v6h-3v-3" />
    <rect x="10.6" y="10.6" width="2.8" height="2.8" rx="0.6" fill="currentColor" stroke="none" />
  </Icon>
)

/** Lettore RFID con onde. */
export const ReaderIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="9" width="10" height="12" rx="2" />
    <path d="M6 13h4M6 16.5h4" />
    <path d="M15.5 7.5a4 4 0 0 1 0 5.6M18.3 4.7a8 8 0 0 1 0 11.3" />
  </Icon>
)

/** Memoria del chip: banchi a parole da 16 bit. */
export const MemoryIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2.5" />
    <path d="M8 7.5h2M12 7.5h4M8 11h5M15 11h1M8 14.5h1M11 14.5h5M8 18h3" />
  </Icon>
)

/** GS1 Digital Link: un QR con un collegamento. */
export const DigitalLinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <path d="M14.5 17.5h2.2a2.3 2.3 0 0 0 0-4.6h-.9M20.5 15.5h-2.2a2.3 2.3 0 0 0 0 4.6h.9" />
  </Icon>
)

/** Chiave GS1: dati con Application Identifier tra parentesi. */
export const KeyDataIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 5C5 7 5 17 7 19M17 5c2 2 2 12 0 14" />
    <path d="M10 9.5h4M10 12h4M10 14.5h2.5" />
  </Icon>
)

/* ───────── Illustrazioni della schermata iniziale ───────── */

const BLUE = '#002c6c'
const ORANGE = '#f26334'
const TEAL = '#22bcb9'
const FOREST = '#00b74f'
const LINE = '#e5e8eb'
const OFF = '#faf9f5'

/** Codifica: i dati GS1 diventano bit nel chip del tag, che li trasmette. */
export function EncodeArt() {
  const scope = useRef<SVGSVGElement>(null)
  useMotion(scope, (m) => {
    const card = m.from('.art-card', { x: -18, opacity: 0 }, { duration: 0.7 })
    m.from('.art-ai', { y: 6, opacity: 0 }, { duration: 0.4, stagger: 0.08, at: card - 0.45 })
    const flow = m.from('.art-bit', { scale: 0, opacity: 0, origin: '50% 50%' }, { duration: 0.35, stagger: 0.035, at: card - 0.2, ease: 'back' })
    m.from('.art-tag', { y: 14, opacity: 0 }, { duration: 0.7, at: card - 0.4 })
    m.from('.art-hex', { opacity: 0 }, { duration: 0.5, at: flow - 0.2 })
  })
  const bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1]
  return (
    <svg ref={scope} className="art" viewBox="0 0 420 240" role="img" aria-label="Dati GS1 codificati nel chip di un tag RFID">
      {/* Scheda dei dati GS1 */}
      <g className="art-card">
        <rect x="10" y="44" width="150" height="152" rx="14" fill="#fff" stroke={LINE} />
        <rect x="10" y="44" width="150" height="34" rx="14" fill={BLUE} />
        <rect x="10" y="64" width="150" height="14" fill={BLUE} />
        <text x="24" y="66" fontSize="12" fontWeight="600" fill="#fff" fontFamily="IBM Plex Sans, sans-serif">
          GS1
        </text>
        {[
          ['01', '08000000000019'],
          ['21', '12345'],
          ['17', '271231'],
          ['10', 'LOT42'],
        ].map(([ai, v], i) => (
          <g key={ai} transform={`translate(24 ${100 + i * 24})`}>
            <g className="art-ai">
            <rect x="0" y="-11" width="30" height="16" rx="4" fill="#e6edf7" />
            <text x="15" y="1" textAnchor="middle" fontSize="10" fontWeight="600" fill={BLUE} fontFamily="IBM Plex Mono, monospace">
              {ai}
            </text>
            <text x="38" y="1" fontSize="10.5" fill="#4a4a4a" fontFamily="IBM Plex Mono, monospace">
              {v}
            </text>
            </g>
          </g>
        ))}
      </g>
      {/* Flusso di bit verso il chip */}
      {bits.map((b, i) => (
        <g key={i} transform={`translate(${178 + i * 11.5} ${116 + Math.sin(i / 1.6) * 6})`}>
          <g className="art-bit">
          <rect x="-5.5" y="-7" width="11" height="14" rx="3" fill={b ? TEAL : '#bfe9e8'} />
          <text y="3.5" textAnchor="middle" fontSize="9" fontWeight="600" fill={b ? '#fff' : '#0b7471'} fontFamily="IBM Plex Mono, monospace">
            {b}
          </text>
          </g>
        </g>
      ))}
      {/* Tag RAIN RFID */}
      <g className="art-tag">
        <rect x="296" y="46" width="114" height="148" rx="12" fill={OFF} stroke={LINE} />
        <path d="M312 120V72h26v96h26v-48M394 120V72h-26v96" fill="none" stroke="#c9a14a" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <circle key={i} className="art-wave" cx="353" cy="120" r="16" fill="none" stroke={TEAL} strokeWidth="1.6" />
        ))}
        <rect x="341" y="108" width="24" height="24" rx="5" fill={BLUE} />
        <rect x="347" y="114" width="12" height="12" rx="2" fill={ORANGE} />
        <g className="art-hex">
          <rect x="306" y="166" width="94" height="20" rx="6" fill="#fff" stroke={LINE} />
          <text x="353" y="180" textAnchor="middle" fontSize="10" fontWeight="600" fill={BLUE} fontFamily="IBM Plex Mono, monospace">
            F790 8000…
          </text>
        </g>
      </g>
      <circle cx="401" cy="56" r="4" fill={FOREST} />
    </svg>
  )
}

/** Decodifica: il lettore legge il tag e i bit tornano dati GS1. */
export function DecodeArt() {
  const scope = useRef<SVGSVGElement>(null)
  useMotion(scope, (m) => {
    const reader = m.from('.art-reader', { x: -16, opacity: 0 }, { duration: 0.7 })
    m.from('.art-beam', { scaleX: 0, origin: '0% 50%' }, { duration: 0.6, stagger: 0.1, at: reader - 0.4, ease: 'inOut' })
    m.from('.art-tag', { y: 12, opacity: 0 }, { duration: 0.6, at: reader - 0.5 })
    m.from('.art-row', { x: 12, opacity: 0 }, { duration: 0.45, stagger: 0.08, at: reader })
  })
  return (
    <svg ref={scope} className="art" viewBox="0 0 420 240" role="img" aria-label="Un lettore RFID legge un tag e ne ricava i dati GS1">
      {/* Lettore */}
      <g className="art-reader">
        <rect x="14" y="70" width="86" height="120" rx="14" fill={BLUE} />
        <rect x="26" y="84" width="62" height="40" rx="6" fill="#0b3f86" />
        <text x="57" y="100" textAnchor="middle" fontSize="8.5" fill="#9fb3d6" fontFamily="IBM Plex Mono, monospace">
          EPC
        </text>
        <text x="57" y="115" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#fff" fontFamily="IBM Plex Mono, monospace">
          3035E848
        </text>
        <circle cx="57" cy="152" r="14" fill="none" stroke="#3d6bb0" strokeWidth="2" />
        <circle cx="57" cy="152" r="6" fill={ORANGE} />
      </g>
      {/* Onde verso il tag */}
      {[0, 1, 2].map((i) => (
        <path key={i} className="art-beam" d={`M110 ${112 + i * 12} Q 150 ${100 + i * 12} 186 ${112 + i * 12}`} fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 6" />
      ))}
      {/* Tag */}
      <g className="art-tag">
        <rect x="194" y="96" width="64" height="44" rx="8" fill={OFF} stroke={LINE} />
        <path d="M202 118v-12h12v24h12v-12M250 118v-12h-12v24" fill="none" stroke="#c9a14a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <rect x="221" y="113" width="10" height="10" rx="2" fill={BLUE} />
      </g>
      {/* Dati ricostruiti */}
      {[
        ['EPC Tag URI', TEAL, 'urn:epc:tag:sgtin-96:1…'],
        ['GS1 Digital Link', FOREST, 'https://id.gs1.org/01/…'],
        ['Element string', BLUE, '(01)0800000000…(21)…'],
      ].map(([label, color, value], i) => (
        <g key={label} transform={`translate(276 ${70 + i * 40})`}>
          <g className="art-row">
          <rect width="136" height="32" rx="8" fill="#fff" stroke={LINE} />
          <rect x="8" y="9" width="14" height="14" rx="4" fill={color} />
          <text x="30" y="14" fontSize="8.5" fontWeight="600" fill="#1f2933" fontFamily="IBM Plex Sans, sans-serif">
            {label}
          </text>
          <text x="30" y="25" fontSize="8" fill="#676c73" fontFamily="IBM Plex Mono, monospace">
            {value}
          </text>
          </g>
        </g>
      ))}
    </svg>
  )
}
