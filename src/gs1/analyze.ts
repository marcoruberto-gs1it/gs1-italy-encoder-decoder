/*
 * Dall'input dell'utente (modulo dell'encoder o testo del decoder) a tutte le rappresentazioni:
 * dati GS1 validati, chiave, lunghezza del GS1 Company Prefix e codifica in ogni schema EPC.
 */
import { loadTdt, type Tdt } from './engine'
import { decodeEpc, encodeScheme, levelLabel, schemesForFamily, type SchemeResult } from './epc'
import { describeAis, looksLikeGs1, parseGs1, type Gs1Data } from './syntax'
import { keyTypeForAis, type Ai, type KeyType } from './schemes'
import { t } from '../i18n'

export type GcpSource = 'Verified by GS1' | 'tag' | 'utente'

/** Stato di Verified by GS1 per la chiave: il GS1 Company Prefix della licenza, se trovato. */
export type VbgGcp = { prefix?: string; pending: boolean }

export type Params = { filter: number; hostname: string; gcpLength: number | null }

export type Analysis = {
  ais: Ai[]
  gs1?: Gs1Data
  error?: string
  errorMarkup?: string
  /** Formato riconosciuto nel decoder. */
  detected?: string
  sourceScheme?: string
  key?: KeyType
  /** Perché non ci sono codifiche RFID. */
  rfidNote?: string
  /** Lunghezza del GS1 Company Prefix: da Verified by GS1, dal tag letto o scelta dall'utente; null se manca. */
  gcp: { length: number | null; source: GcpSource | null; pending: boolean }
  params: { filter: number; hostname: string }
  results: SchemeResult[]
}

/** Cifre su cui si cerca il GS1 Company Prefix: senza indicatore / cifra di estensione iniziale. */
export function prefixDigits(ais: Ai[]): string | undefined {
  const k = ais[0]
  if (!k) return undefined
  if (['01', '00', '8003', '8006'].includes(k.ai)) return k.value.slice(1)
  return k.value
}

export async function analyzeEncode(ais: Ai[], params: Params, vbg: VbgGcp = { pending: false }): Promise<Analysis> {
  const tdt = await loadTdt()
  return finish(tdt, ais.filter((a) => a.value !== ''), params, vbg)
}

export async function analyzeDecode(text: string, params: Params, vbg: VbgGcp = { pending: false }): Promise<Analysis> {
  const tdt = await loadTdt()
  const empty: Analysis = { ais: [], gcp: { length: null, source: null, pending: false }, params, results: [] }
  const input = text.trim()
  if (!input) return empty

  const epc = decodeEpc(tdt, input)
  if (epc && 'error' in epc) return { ...empty, error: epc.error }
  if (epc) {
    const merged: Params = {
      filter: epc.filter ?? params.filter,
      hostname: epc.hostname ?? params.hostname,
      gcpLength: params.gcpLength,
    }
    const a = await finish(tdt, epc.ais, merged, vbg, epc.gcpLength)
    return { ...a, detected: `${levelLabel(epc.level)} · ${epc.scheme}`, sourceScheme: epc.scheme }
  }
  if (!looksLikeGs1(input)) {
    return { ...empty, error: t('Formato non riconosciuto. Prova con un EPC esadecimale, un URN urn:epc:…, un GS1 Digital Link, un’element string (01)… o un GTIN.') }
  }
  const parsed = await parseGs1(input)
  if (!parsed.ok) return { ...empty, error: parsed.error, errorMarkup: parsed.markup }
  const kind = /^https?:/i.test(input) ? 'GS1 Digital Link URI' : /^\(/.test(input) ? t('Element string GS1') : /^\d+$/.test(input) ? 'GTIN' : t('Dati GS1 con FNC1')
  const a = await finish(tdt, parsed.data.ais, params, vbg)
  return { ...a, detected: kind }
}

async function finish(tdt: Tdt, ais: Ai[], params: Params, vbg: VbgGcp, tagGcp?: number): Promise<Analysis> {
  const gcp = gcpFor(ais, params, vbg, tagGcp)
  const base: Analysis = { ais, gcp, params: { filter: params.filter, hostname: params.hostname }, results: [] }
  if (!ais.length) return base

  const described = await describeAis(ais)
  if (!described.ok) return { ...base, error: described.error, errorMarkup: described.markup }
  const gs1 = described.data
  // Ordine canonico: la chiave e i suoi qualificatori prima, poi gli altri AI.
  const key = keyTypeForAis(gs1.ais)
  const ordered = key ? [...key.fields.map((f) => gs1.ais.find((a) => a.ai === f.ai)).filter((a): a is Ai => Boolean(a)), ...gs1.ais.filter((a) => !key.fields.some((f) => f.ai === a.ai))] : gs1.ais
  const withGs1 = { ...base, ais: ordered, gs1, key }

  if (!key) return { ...withGs1, rfidNote: t('Per un tag RFID serve una chiave GS1 serializzata: GTIN + seriale, SSCC, GLN, GRAI, GIAI, GSRN, GDTI, GCN, CPI o ITIP.') }
  const missing = key.fields.find((f) => !f.optional && !ordered.some((a) => a.ai === f.ai))
  if (missing) {
    return {
      ...withGs1,
      rfidNote:
        missing.ai === '21'
          ? t('Per un tag RFID serve anche il numero di serie (AI 21): ogni tag identifica un singolo esemplare. I barcode qui sotto valgono comunque.')
          : t('Per un tag RFID serve anche {label} (AI {ai}).', { label: missing.label, ai: missing.ai }),
    }
  }

  const results = schemesForFamily(tdt, key.id).map((s) => encodeScheme(tdt, s, ordered, { filter: params.filter, gcpLength: gcp.length, gcpPending: gcp.pending, hostname: params.hostname }))
  return { ...withGs1, results }
}

/** Il GS1 Company Prefix viene dalla licenza su Verified by GS1; se non c'è, dal tag letto o dalla scelta dell'utente. */
function gcpFor(ais: Ai[], params: Params, vbg: VbgGcp, tagGcp?: number): Analysis['gcp'] {
  const digits = prefixDigits(ais)
  const p = vbg.prefix
  if (digits && p && digits.startsWith(p) && p.length >= 4 && p.length <= 12) return { length: p.length, source: 'Verified by GS1', pending: false }
  if (tagGcp) return { length: tagGcp, source: 'tag', pending: false }
  if (params.gcpLength) return { length: params.gcpLength, source: 'utente', pending: false }
  return { length: null, source: null, pending: vbg.pending }
}
