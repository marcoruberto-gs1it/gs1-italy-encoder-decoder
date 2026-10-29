import type { Segment } from './gs1/epc'

const FIXED: Partial<Record<Segment['kind'], string>> = {
  header: '#002c6c',
  toggle: '#6b5bd6',
  filter: '#f26334',
  partition: '#e9a23b',
  dateType: '#b14fc5',
  date: '#d9468f',
  aiId: '#8b96a8',
  hostname: '#0f9bb0',
  reserved: '#aab3c2',
  padding: '#d5dbe5',
}

const PALETTE = ['#1f6fd1', '#14a37f', '#7c4dff', '#c2410c', '#0e7490', '#9d174d', '#4d7c0f', '#6d28d9']

/** Colore di ogni segmento: fisso per i campi strutturali, a rotazione per i dati. */
export function segmentColors(segments: Segment[]): string[] {
  let n = 0
  return segments.map((s) => FIXED[s.kind] ?? PALETTE[n++ % PALETTE.length])
}

export const CRC_COLOR = '#5b6b85'
export const PC_COLOR = '#93a1b8'
