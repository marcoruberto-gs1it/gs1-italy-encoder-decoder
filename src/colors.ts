import type { Segment } from './gs1/epc'

/*
 * Colori dei campi dell'EPC, dalla palette GS1 Italy (blu #002C6C, arancione #F26334, teal #22BCB9,
 * forest #00B74F) e dai suoi toni. Devono leggersi sia sul display blu della lettura sia su fondo bianco.
 */
const FIXED: Partial<Record<Segment['kind'], string>> = {
  header: '#7d9ccf',
  toggle: '#9b8cf2',
  filter: '#f26334',
  partition: '#f2a93b',
  dateType: '#c77ddb',
  date: '#e8619f',
  aiId: '#93a0b4',
  hostname: '#22bcb9',
  reserved: '#6f7f97',
  padding: '#c9d0da',
}

const PALETTE = ['#4b8df8', '#00b74f', '#22bcb9', '#f2a93b', '#9b6bf2', '#e8619f', '#86c440', '#5cc3ee']

/** Colore di ogni segmento: quello dell'AI per i dati GS1, fisso per i campi strutturali, a rotazione per gli altri. */
export function segmentColors(segments: Segment[]): string[] {
  let n = 0
  return segments.map((s) => (s.ai && (s.kind === 'aiData' || s.kind === 'aiId' || s.kind === 'date') ? aiColor(s.ai) : (FIXED[s.kind] ?? PALETTE[n++ % PALETTE.length])))
}

/*
 * Colore di ogni Application Identifier, uguale in tutta l'app (riepilogo, campi, Digital Link, bit del tag).
 * Toni scuri: si leggono come testo su bianco e reggono il testo bianco sopra (contrasto ≥ 4,5:1).
 */
const KEY_COLOR = '#1f5fbf'
const AI_COLORS: Record<string, string> = {
  '21': '#7a3bc9',
  '254': '#7a3bc9',
  '10': '#0b7a77',
  '17': '#c43e12',
  '11': '#8a5a00',
  '13': '#9c4a12',
  '15': '#b4235f',
  '16': '#b42318',
  '7003': '#6b4f1d',
  '7006': '#3f6b00',
  '7007': '#7a5a00',
  '422': '#0b6593',
}
const KEY_AIS = ['00', '01', '253', '255', '414', '8003', '8004', '8006', '8010', '8017', '8018']
const OTHER_COLORS = ['#4a5d7e', '#8f3f71', '#2f6f4f', '#7a4b21', '#3f51b5', '#6d4c9f']

export function aiColor(ai: string): string {
  if (KEY_AIS.includes(ai)) return KEY_COLOR
  if (AI_COLORS[ai]) return AI_COLORS[ai]
  if (/^3\d{3}$/.test(ai)) return '#1f7a3a'
  const n = [...ai].reduce((s, c) => s * 31 + c.charCodeAt(0), 7)
  return OTHER_COLORS[n % OTHER_COLORS.length]
}

export const CRC_COLOR = '#5d6b80'
export const PC_COLOR = '#94a2b6'

/** Testo leggibile sopra un colore: bianco sui toni scuri, blu GS1 molto scuro sui toni chiari. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.32 ? '#0b1f3f' : '#ffffff'
}
