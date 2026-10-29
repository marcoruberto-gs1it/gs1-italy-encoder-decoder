/*
 * Codifica e decodifica EPC con il motore GS1 TDT 2.3, più la scomposizione del binario in campi
 * spiegati (header, filter, partizione, AI, hostname, padding) per mostrarne la struttura.
 */
import TDTtranslator from '../vendor/tdt/TDTtranslator.js'
import type { Tdt } from './engine'
import { DATE_TYPES, FIELD_LABELS, familyOf, filterMeaning, kindOf, type Ai, type SchemeKind } from './schemes'
import { aiLabel } from './aiDictionary'
import { k, t } from '../i18n'

export type SegmentKind =
  | 'header'
  | 'toggle'
  | 'filter'
  | 'partition'
  | 'dateType'
  | 'date'
  | 'field'
  | 'aiId'
  | 'aiData'
  | 'hostname'
  | 'reserved'
  | 'padding'

export type SubPart = { label: string; bits: string; note?: string }

export type Segment = {
  kind: SegmentKind
  label: string
  bits: string
  start: number
  value?: string
  note?: string
  ai?: string
  /** Fa parte dei dati aggiuntivi (+AIDC). */
  plus?: boolean
  parts?: SubPart[]
}

export type Uris = { tag?: string; pure?: string; dl?: string; bare?: string; json?: string }

export type SchemeResult =
  | {
      scheme: string
      kind: SchemeKind
      ok: true
      /** Binario come scritto nella memoria EPC del tag: completato a multipli di 16 bit. */
      bits: string
      /** Lunghezza dell'EPC prima del completamento a 16 bit. */
      length: number
      hex: string
      segments: Segment[]
      uris: Uris
      /** AI non rappresentabili nello schema (es. lotto e scadenza negli schemi TDS 1.x). */
      dropped: Ai[]
    }
  | { scheme: string; kind: SchemeKind; ok: false; error: string }

export type EncodeOptions = { filter: number; gcpLength: number | null; gcpPending?: boolean; hostname: string; uriStem?: string }

const CONTAINER = 'tdt:epcTagDataTranslation'
const DEFAULT_STEM = 'https://id.gs1.org'

export const schemeDef = (tdt: Tdt, scheme: string) => tdt.tdtData.scheme[scheme][CONTAINER].scheme

/** AI usati dalla chiave dello schema (dal livello GS1_AI_JSON degli artefatti TDT). */
export function schemeAis(tdt: Tdt, scheme: string): string[] {
  const level = schemeDef(tdt, scheme).level.find((l: { type: string }) => l.type === 'GS1_AI_JSON')
  if (!level) return []
  return [...new Set<string>(level.option.flatMap((o: { aiSequence?: string[] }) => o.aiSequence ?? []))]
}

/** Schemi di una famiglia nell'ordine di presentazione: TDS 1.x, poi +, poi ++. */
export function schemesForFamily(tdt: Tdt, family: string): string[] {
  const rank = (s: string) => {
    const kind = kindOf(s)
    const dated = s.startsWith('DSGTIN') ? 1 : 0
    const size = Number(s.match(/-(\d+)/)?.[1] ?? 999)
    return (kind === 'legacy' ? 0 : kind === 'plus' ? 1000 : 2000) + dated * 500 + size
  }
  return tdt
    .schemes()
    .filter((s) => familyOf(s) === family && schemeAis(tdt, s).length > 0)
    .sort((a, b) => rank(a) - rank(b))
}

const DATE_FIELDS: Record<string, string> = {
  prodDate: '11',
  packDate: '13',
  bestBeforeDate: '15',
  sellByDate: '16',
  expDate: '17',
  firstFreezeDate: '7006',
  harvestDate: '7007',
}

const ENCODING_INDICATORS: Record<string, string> = {
  '000': k('solo cifre: il numero intero in binario'),
  '001': k('esadecimale maiuscolo: 4 bit per carattere'),
  '010': k('esadecimale minuscolo: 4 bit per carattere'),
  '011': k('base64 file-safe/URI-safe: 6 bit per carattere'),
  '100': k('ASCII a 7 bit per carattere'),
  '101': k('URN Code 40: 3 caratteri ogni 16 bit'),
}

/** Dati degli AI per lo schema: negli schemi TDS 1.x solo la chiave; per SGLN senza estensione si usa 0. */
function aisForScheme(tdt: Tdt, scheme: string, ais: Ai[]): { used: Ai[]; dropped: Ai[] } {
  const keyAis = schemeAis(tdt, scheme)
  let list = ais
  if (familyOf(scheme) === 'sgln' && !list.some((a) => a.ai === '254')) list = [...list, { ai: '254', value: '0' }]
  if (kindOf(scheme) !== 'legacy') return { used: list, dropped: [] }
  return { used: list.filter((a) => keyAis.includes(a.ai)), dropped: list.filter((a) => !keyAis.includes(a.ai)) }
}

const toJson = (ais: Ai[]) => `{${ais.map((a) => `${JSON.stringify(a.ai)}:${JSON.stringify(a.value)}`).join(',')}}`

export const padTo16 = (bits: string) => bits + '0'.repeat((16 - (bits.length % 16)) % 16)

export function bitsToHex(bits: string): string {
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2).toString(16).toUpperCase()
  return hex
}

const cleanError = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  if (/pattern validation mismatch/i.test(msg)) return t('I dati non rientrano nei limiti di questo schema.')
  if (/Missing argument hostname/i.test(msg)) return t('Serve il dominio (hostname) da scrivere nel tag.')
  if (/hostname/i.test(msg)) return t('Il dominio contiene caratteri non ammessi.')
  return msg
}

/** Spiegazioni specifiche dei limiti degli schemi TDS 1.x. */
const LIMITS: Record<string, string> = {
  'SGTIN-96': k('Il seriale deve essere numerico, senza zeri iniziali e non superiore a 274.877.906.943 (38 bit).'),
  'SGTIN-198': k('Il seriale può avere al massimo 20 caratteri.'),
  'SSCC-96': k('L’SSCC deve avere 18 cifre.'),
  'SGLN-96': k('L’estensione deve essere numerica, senza zeri iniziali, fino a 41 bit.'),
  'SGLN-195': k('L’estensione può avere al massimo 20 caratteri.'),
  'GRAI-96': k('Il seriale del GRAI deve essere numerico, senza zeri iniziali, fino a 38 bit.'),
  'GRAI-170': k('Il seriale del GRAI può avere al massimo 16 caratteri.'),
  'GIAI-96': k('Il riferimento del bene deve essere numerico, senza zeri iniziali.'),
  'GIAI-202': k('Il riferimento del bene può avere al massimo 24 caratteri.'),
  'GDTI-96': k('Il seriale del documento deve essere numerico, senza zeri iniziali, fino a 41 bit.'),
  'GDTI-174': k('Il seriale del documento può avere al massimo 17 caratteri.'),
  'SGCN-96': k('Il seriale del coupon deve essere numerico, fino a 12 cifre.'),
  'CPI-96': k('Il CPI deve essere numerico e il seriale fino a 31 bit.'),
  'ITIP-110': k('Il seriale deve essere numerico, senza zeri iniziali, fino a 38 bit.'),
  'ITIP-212': k('Il seriale può avere al massimo 20 caratteri.'),
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn()
  } catch {
    return undefined
  }
}

/** Codifica gli AI in uno schema EPC: binario, hex, URN, Digital Link e scomposizione dei campi. */
export function encodeScheme(tdt: Tdt, scheme: string, ais: Ai[], opts: EncodeOptions): SchemeResult {
  const kind = kindOf(scheme)
  const fail = (error: string): SchemeResult => ({ scheme, kind, ok: false, error })

  if (scheme.startsWith('DSGTIN') && !ais.some((a) => DATE_TYPES.some((d) => d.ai === a.ai))) {
    return fail(t('Serve una data GS1 (es. AI 17 scadenza o AI 11 produzione): DSGTIN la scrive in testa al tag.'))
  }
  if (kind === 'plusplus' && !opts.hostname) return fail(t('Serve il dominio (hostname) da scrivere nel tag.'))
  if (kind === 'legacy' && !opts.gcpLength) {
    return fail(
      opts.gcpPending
        ? t('In attesa di Verified by GS1 per la lunghezza del GS1 Company Prefix…')
        : t('Scegli la lunghezza del GS1 Company Prefix nei parametri del tag: Verified by GS1 non la fornisce per questo codice.'),
    )
  }

  const { used, dropped } = aisForScheme(tdt, scheme, ais)
  const json = toJson(used)
  const options = (extra: Record<string, unknown> = {}) => ({
    filter: opts.filter,
    uriStem: opts.uriStem ?? DEFAULT_STEM,
    ...(kind === 'legacy' ? { gs1companyprefixlength: opts.gcpLength } : {}),
    ...(kind === 'plusplus' ? { hostname: opts.hostname } : {}),
    ...extra,
  })

  let parts: string[]
  let names: string[]
  try {
    ;[parts, names] = tdt.translate(json, scheme, 'BINARY', options({ returnArray: true }))
  } catch (e) {
    const msg = cleanError(e)
    return fail(LIMITS[scheme] && /pattern validation mismatch/i.test(e instanceof Error ? e.message : '') ? `${msg} ${t(LIMITS[scheme])}` : msg)
  }

  const raw = parts.join('')
  const declared = Number(scheme.match(/-(\d+)$/)?.[1])
  if (declared && raw.length !== declared) return fail(`${t('Il valore non entra nei {bits} bit dello schema.', { bits: declared })} ${LIMITS[scheme] ? t(LIMITS[scheme]) : ''}`.trim())

  // Verifica di andata e ritorno: lo schema deve restituire esattamente gli stessi dati.
  const back = safe(() => JSON.parse(tdt.translate(raw, scheme, 'GS1_AI_JSON', {})) as Record<string, string>)
  if (back) {
    const lost = used.find((a) => back[a.ai] !== a.value)
    if (lost) return fail(`${t('Il valore di AI ({ai}) “{value}” non si può rappresentare esattamente in {scheme}.', { ai: lost.ai, value: lost.value, scheme })} ${LIMITS[scheme] ? t(LIMITS[scheme]) : ''}`.trim())
  }

  const bits = padTo16(raw)
  const tagValues: Record<string, string> = {}
  const tagArr = safe(() => tdt.translate(json, scheme, 'TAG_ENCODING', options({ returnArray: true })) as [string[], string[]])
  if (tagArr) tagArr[1].forEach((n, i) => (tagValues[n] = tagArr[0][i]))

  const uris: Uris = {
    tag: safe(() => tdt.translate(json, scheme, 'TAG_ENCODING', options())),
    pure: safe(() => tdt.translate(json, scheme, 'PURE_IDENTITY', options())),
    dl: safe(() => tdt.translate(json, scheme, 'GS1_DIGITAL_LINK', options())),
    bare: safe(() => tdt.translate(json, scheme, 'BARE_IDENTIFIER', options())),
  }

  return {
    scheme,
    kind,
    ok: true,
    bits,
    length: raw.length,
    hex: bitsToHex(bits),
    segments: buildSegments(tdt, scheme, parts, names, used, tagValues, opts.hostname, bits.length - raw.length),
    uris,
    dropped,
  }
}

function buildSegments(tdt: Tdt, scheme: string, parts: string[], names: string[], ais: Ai[], tagValues: Record<string, string>, hostname: string, padding: number): Segment[] {
  const family = familyOf(scheme)
  const kind = kindOf(scheme)
  const def = schemeDef(tdt, scheme)
  const binOption = def.level.find((l: { type: string }) => l.type === 'BINARY').option[0]
  const fieldDef = (name: string) => binOption.field?.find((f: { name: string }) => f.name === name)
  const valueOf = (ai: string) => ais.find((a) => a.ai === ai)?.value ?? ''
  const keyAis = schemeAis(tdt, scheme)

  const segments: Segment[] = []
  let start = 0
  const push = (s: Omit<Segment, 'start'>) => {
    segments.push({ ...s, start })
    start += s.bits.length
  }

  names.forEach((name, i) => {
    const bits = parts[i]
    if (!bits) return
    const prev = names[i - 1]

    if (name === 'EPC Header') {
      return push({ kind: 'header', label: t('Header EPC'), bits, value: bitsToHex(bits), note: t('Il primo byte {hex}h dice al lettore che il tag contiene uno {scheme}.', { hex: bitsToHex(bits), scheme }) })
    }
    if (name === 'dataToggle') {
      return push({ kind: 'toggle', label: '+AIDC data toggle', bits, value: bits, note: bits === '1' ? t('Dopo la chiave seguono altri AI (+AIDC).') : t('Nessun AI aggiuntivo dopo la chiave.') })
    }
    if (name === 'filter') {
      const v = parseInt(bits, 2)
      return push({ kind: 'filter', label: 'Filter value', bits, value: String(v), note: t('{meaning}: permette ai lettori di selezionare solo certi tag.', { meaning: filterMeaning(family, v) }) })
    }
    if (name === 'literal') {
      if (scheme.startsWith('DSGTIN') && prev === 'filter') {
        const d = DATE_TYPES.find((x) => x.code === bits)
        return push({ kind: 'dateType', label: t('Tipo di data'), bits, value: d ? `AI ${d.ai}` : bits, note: d ? t('{label} (AI {ai}): la data prioritaria scritta in testa al tag.', { label: d.label, ai: d.ai }) : undefined })
      }
      if (kind === 'legacy' && prev === 'filter') {
        const gcp = parts[names.indexOf('gs1companyprefix')]?.length
        const ref = parts[i + 2]?.length
        return push({
          kind: 'partition',
          label: t('Partizione'),
          bits,
          value: String(parseInt(bits, 2)),
          note: t('Dice dove finisce il GS1 Company Prefix: {digits} cifre in {gcp} bit, poi {ref} bit per il riferimento.', { digits: tagValues.gs1companyprefix?.length ?? '?', gcp: gcp ?? '?', ref: ref ?? '?' }),
        })
      }
      return push({ kind: 'reserved', label: t('Bit riservati'), bits, note: t('Bit fissi previsti dallo schema (riservati o terminatore).') })
    }
    if (DATE_FIELDS[name]) {
      const ai = DATE_FIELDS[name]
      const v = valueOf(ai)
      return push({
        kind: 'date',
        label: aiLabel(ai),
        ai,
        bits,
        value: v,
        note: t('Data AAMMGG in 16 bit: anno (7), mese (4), giorno (5).'),
        parts: [
          { label: t('anno {v}', { v: v.slice(0, 2) }), bits: bits.slice(0, 7) },
          { label: t('mese {v}', { v: v.slice(2, 4) }), bits: bits.slice(7, 11) },
          { label: t('giorno {v}', { v: v.slice(4, 6) }), bits: bits.slice(11, 16) },
        ],
      })
    }
    let m: RegExpMatchArray | null
    if ((m = name.match(/^AI (\d+) identifier$/))) {
      const ai = m[1]
      return push({
        kind: 'aiId',
        label: `AI (${ai})`,
        ai,
        bits,
        value: ai,
        plus: true,
        note: t('Codice dell’AI aggiuntivo, {n} cifre da 4 bit: {label}.', { n: ai.length, label: aiLabel(ai) }),
        parts: [...ai].map((c, k) => ({ label: c, bits: bits.slice(k * 4, k * 4 + 4) })),
      })
    }
    if ((m = name.match(/^AI (\d+) data$/))) {
      const ai = m[1]
      const value = valueOf(ai)
      const plus = !keyAis.includes(ai)
      return push({ kind: 'aiData', label: `${aiLabel(ai)} (${ai})`, ai, bits, value, plus, note: plus ? t('Dato aggiuntivo (+AIDC) codificato secondo la tabella F del TDT.') : t('Valore dell’AI codificato secondo la tabella F del TDT.'), parts: aiDataParts(tdt, ai, value, bits) })
    }
    if (name === 'binaryHostname') {
      const ind = bits[0]
      const len = parseInt(bits.slice(1, 7), 2)
      return push({
        kind: 'hostname',
        label: t('Dominio (hostname)'),
        bits,
        value: hostname,
        note: t('Il dominio del GS1 Digital Link, compresso: il tag ricostruisce da solo il link completo.'),
        parts: [
          { label: ind === '0' ? 'URN Code 40' : t('ASCII 7 bit + tabelle'), bits: ind, note: t('metodo di compressione') },
          { label: t('lunghezza {n}', { n: len }), bits: bits.slice(1, 7) },
          { label: hostname, bits: bits.slice(7) },
        ],
      })
    }
    const fd = fieldDef(name)
    const compaction = fd?.compaction as string | undefined
    push({
      kind: 'field',
      label: FIELD_LABELS[name] ? t(FIELD_LABELS[name]) : name,
      bits,
      value: tagValues[name],
      note: compaction ? t('Caratteri in ASCII a {n} bit, completati con zeri fino a {bits} bit.', { n: parseInt(compaction), bits: bits.length }) : t('Numero intero in binario su {bits} bit.', { bits: bits.length }),
    })
  })

  if (padding > 0) {
    push({ kind: 'padding', label: t('Completamento'), bits: '0'.repeat(padding), note: t('La memoria EPC è fatta di parole da 16 bit: si aggiungono {n} zeri.', { n: padding }) })
  }
  return segments
}

/** Scompone il valore di un AI secondo la tabella F (indicatori di codifica e lunghezza, dati). */
function aiDataParts(tdt: Tdt, ai: string, value: string, bits: string): SubPart[] | undefined {
  const row = tdt.tdtData.table.F?.[ai]
  if (!row) return undefined
  const comps: [string, string, Record<string, string | undefined>][] = row.j
    ? [
        [value.slice(0, Number(row.d)), row.c, { d: row.d, e: row.e, f: row.f, g: row.g, h: row.h, b: row.b }],
        [value.slice(Number(row.d)), row.j, { d: row.k, e: row.l, f: row.m, g: row.n, h: row.o, b: row.i }],
      ]
    : [[value, row.c, { d: row.d, e: row.e, f: row.f, g: row.g, h: row.h, b: row.b }]]

  const out: SubPart[] = []
  let cursor = 0
  for (const [v, section, c] of comps) {
    const bin = safe(
      () =>
        TDTtranslator.toBinaryUsingTableF(v, {
          section,
          fixLenChrs: parseInt(c.d ?? ''),
          fixLenBits: parseInt(c.e ?? ''),
          encIndBits: parseInt(c.f ?? ''),
          lenIndBits: parseInt(c.g ?? ''),
          maxChars: parseInt(c.h ?? ''),
        }).binary,
    )
    if (!bin || bits.slice(cursor, cursor + bin.length) !== bin) return undefined
    out.push(...splitComponent(v, section, bin, Number(c.g ?? 0), c.b ?? ''))
    cursor += bin.length
  }
  return out
}

function splitVariable(v: string, bin: string, lenBits: number): SubPart[] {
  const ind = bin.slice(0, 3)
  return [
    { label: t('codifica'), bits: ind, note: ENCODING_INDICATORS[ind] ? t(ENCODING_INDICATORS[ind]) : undefined },
    { label: t('lunghezza {n}', { n: v.length }), bits: bin.slice(3, 3 + lenBits) },
    { label: v, bits: bin.slice(3 + lenBits) },
  ]
}

function splitComponent(v: string, section: string, bin: string, lenBits: number, method: string): SubPart[] {
  if (section === '14.5.6') return splitVariable(v, bin, lenBits)
  if (section === '14.5.4') return [{ label: v, bits: bin, note: t('{n} cifre × 4 bit', { n: v.length }) }]
  if (section === '14.5.5') {
    const n = v.match(/^\d*/)![0].length
    const digits = { label: v.slice(0, n), bits: bin.slice(0, n * 4), note: t('cifre da 4 bit') }
    const delim = bin.slice(n * 4, n * 4 + 4)
    const parts: SubPart[] = n ? [digits] : []
    parts.push({ label: delim === '1111' ? t('fine') : t('passa ad alfanumerico'), bits: delim })
    if (delim === '1110') parts.push(...splitVariable(v.slice(n), bin.slice(n * 4 + 4), lenBits))
    return parts
  }
  return [{ label: v, bits: bin, note: method }]
}

export type Decoded = {
  scheme: string
  level: string
  ais: Ai[]
  filter?: number
  gcpLength?: number
  hostname?: string
  /** Risultato completo dello schema di origine (per i dati di partenza in binario/URN). */
  uris: Uris
}

const LEVEL_LABELS: Record<string, string> = {
  HEX: k('EPC binario in esadecimale'),
  BINARY: k('EPC binario'),
  TAG_ENCODING: 'EPC Tag URI',
  PURE_IDENTITY: 'EPC Pure Identity URI',
  GS1_DIGITAL_LINK: 'GS1 Digital Link URI',
  BARE_IDENTIFIER: k('Identificatore TDT'),
  GS1_AI_JSON: 'GS1 AI JSON',
  COMPRESSED_GS1_DIGITAL_LINK: k('GS1 Digital Link compresso'),
}
export const levelLabel = (level: string) => (LEVEL_LABELS[level] ? t(LEVEL_LABELS[level]) : level)

/** Decodifica un EPC (hex, binario, URN, Digital Link compresso) in AI + parametri del tag. */
export function decodeEpc(tdt: Tdt, input: string): Decoded | { error: string } | null {
  let text = input.trim().replace(/\s+/g, '')
  if (/^(0x)?[0-9a-f]+$/i.test(text)) text = text.replace(/^0x/i, '').toUpperCase()
  const found = safe(() => tdt.autodetect(text)) ?? []
  // I Digital Link non compressi e le element string li legge la GS1 Syntax Engine.
  const useful = found.filter((d) => !['GS1_DIGITAL_LINK', 'GS1_AI_JSON', 'BARE_IDENTIFIER'].includes(d.level))
  if (!useful.length) return null
  const d = useful[0]
  const json = safe(() => tdt.translate(text, d.scheme, 'GS1_AI_JSON', {}) as string)
  if (!json) {
    const tag = safe(() => tdt.translate(text, d.scheme, 'TAG_ENCODING', {}) as string)
    return { error: t('Riconosciuto {scheme} ({level}), ma lo schema non corrisponde a una chiave GS1.', { scheme: d.scheme, level: levelLabel(d.level) }) + (tag ? ` ${tag}` : '') }
  }
  const obj = JSON.parse(json) as Record<string, string>
  const ais = Object.entries(obj).map(([ai, value]) => ({ ai, value }))
  const keyAis = schemeAis(tdt, d.scheme)
  ais.sort((a, b) => (keyAis.indexOf(a.ai) + 1 || 99) - (keyAis.indexOf(b.ai) + 1 || 99))

  let filter: number | undefined
  let hostname: string | undefined
  const bin = safe(() => tdt.translate(text, d.scheme, 'BINARY', { returnArray: true }) as [string[], string[]])
  if (bin) {
    const i = bin[1].indexOf('filter')
    if (i >= 0) filter = parseInt(bin[0][i], 2)
  } else {
    const m = text.match(/^urn:epc:tag:[^:]+:(\d)\./)
    if (m) filter = Number(m[1])
  }
  const dl = safe(() => tdt.translate(text, d.scheme, 'GS1_DIGITAL_LINK', { uriStem: DEFAULT_STEM }) as string)
  if (kindOf(d.scheme) === 'plusplus' && dl) hostname = new URL(dl).hostname
  const gcpLength = d.optionKey.property === 'gs1companyprefixlength' ? Number(d.optionKey.value) : undefined
  return { scheme: d.scheme, level: d.level, ais, filter, gcpLength, hostname, uris: { dl } }
}
