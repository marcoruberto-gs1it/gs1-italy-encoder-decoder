/*
 * Stato dell'app nell'indirizzo della pagina, per condividere una codifica o una decodifica con un link.
 *   Decoder: ?mode=decode&q=<dato>
 *   Encoder: ?k=<chiave>&a01=<valore>&a21=<valore>&x17=<valore>   (a = dati della chiave, x = dati aggiuntivi)
 *   Comuni:  s=<schema>  f=<filter value>  h=<dominio>  g=<lunghezza del GS1 Company Prefix>  t=<sezioni aperte, separate da virgola>
 * Gli altri parametri (es. lang) restano com'erano.
 */
import type { Mode } from './App'
import type { EncoderState } from './components/InputPanel'
import type { Params } from './gs1/analyze'
import { keyType } from './gs1/schemes'

export const TABS = ['barcode', 'vbg', 'epc', 'rfid', 'journey', 'formats'] as const
export type Tab = (typeof TABS)[number]

export type UrlState = { mode: Mode; encoder: EncoderState; decodeText: string; params: Params; scheme: string | null; open: Tab[] }

const OWN = /^(mode|q|k|s|f|h|g|t|[ax]\d{2,4})$/
const DEFAULT_HOST = 'id.gs1.org'
/** Limiti per un link ricevuto da altri: nessun dato GS1 reale li supera. */
export const LIMITS = { text: 2000, value: 90, extras: 30, host: 253, scheme: 16 }

export function parseUrlState(search: string, empty: EncoderState): Omit<UrlState, 'params'> & { params: Partial<Params> } {
  const q = new URLSearchParams(search)
  const params: Partial<Params> = {}
  const f = Number(q.get('f'))
  if (q.has('f') && Number.isInteger(f) && f >= 0 && f <= 7) params.filter = f
  const h = q.get('h')
  if (h && h.length <= LIMITS.host && /^[A-Za-z0-9.-]+$/.test(h)) params.hostname = h
  const g = Number(q.get('g'))
  if (Number.isInteger(g) && g >= 6 && g <= 12) params.gcpLength = g

  const encoder: EncoderState = { ...empty, values: {}, extras: [] }
  const k = q.get('k')
  if (k && keyType(k)) encoder.keyId = k
  for (const [name, raw] of q) {
    const value = raw.slice(0, LIMITS.value)
    if (/^a\d{2,4}$/.test(name)) encoder.values[name.slice(1)] = value
    else if (/^x\d{2,4}$/.test(name) && encoder.extras.length < LIMITS.extras) encoder.extras.push({ ai: name.slice(1), value })
  }
  const decodeText = (q.get('q') ?? '').slice(0, LIMITS.text)
  const mode: Mode = q.get('mode') === 'decode' || (decodeText && !k) ? 'decode' : 'encode'
  const open = TABS.filter((x) => (q.get('t') ?? '').split(',').includes(x))
  const s = q.get('s')
  return { mode, encoder, decodeText, params, scheme: s && s.length <= LIMITS.scheme ? s : null, open }
}

export function buildUrlState(s: UrlState, search: string): string {
  const q = new URLSearchParams(search)
  for (const name of [...q.keys()]) if (OWN.test(name)) q.delete(name)
  if (s.mode === 'decode') {
    if (s.decodeText.trim()) {
      q.set('mode', 'decode')
      q.set('q', s.decodeText.trim())
    } else q.set('mode', 'decode')
  } else {
    const filled = Object.entries(s.encoder.values).filter(([, v]) => v)
    if (filled.length || s.encoder.extras.length) {
      q.set('k', s.encoder.keyId)
      for (const [ai, v] of filled) q.set(`a${ai}`, v)
      for (const x of s.encoder.extras) if (/^\d{2,4}$/.test(x.ai) && x.value) q.set(`x${x.ai}`, x.value)
    }
  }
  if (q.has('q') || q.has('k')) {
    if (s.scheme) q.set('s', s.scheme)
    q.set('f', String(s.params.filter))
    if (s.params.hostname && s.params.hostname !== DEFAULT_HOST) q.set('h', s.params.hostname)
    if (s.params.gcpLength) q.set('g', String(s.params.gcpLength))
    if (s.open.length) q.set('t', TABS.filter((x) => s.open.includes(x)).join(','))
  }
  const out = q.toString()
  return out ? `?${out}` : ''
}

export function readUrlState(empty: EncoderState) {
  if (typeof window === 'undefined') return parseUrlState('', empty)
  return parseUrlState(window.location.search, empty)
}

export function writeUrlState(s: UrlState) {
  const next = buildUrlState(s, window.location.search)
  if (next === window.location.search) return
  window.history.replaceState(null, '', `${window.location.pathname}${next}${window.location.hash}`)
}
