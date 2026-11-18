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

/** Colore di ogni segmento: fisso per i campi strutturali, a rotazione per i dati. */
export function segmentColors(segments: Segment[]): string[] {
  let n = 0
  return segments.map((s) => FIXED[s.kind] ?? PALETTE[n++ % PALETTE.length])
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
