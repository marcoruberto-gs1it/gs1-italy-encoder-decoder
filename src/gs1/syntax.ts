/*
 * Dati GS1 con la GS1 Barcode Syntax Engine: legge element string, dati FNC1, GS1 Digital Link e GTIN,
 * li valida con il GS1 Barcode Syntax Dictionary e produce le altre rappresentazioni (HRI, Digital Link).
 */
import { loadSyntaxEngine } from './engine'
import { lang } from '../i18n'
import type { Ai } from './schemes'

export type Gs1Data = {
  ais: Ai[]
  /** Element string con parentesi, es. (01)08001234567897(21)12345 */
  elementString: string
  /** Dati come trasmessi dal lettore, con ^ al posto di FNC1/GS. */
  scanData: string
  hri: string[]
  dl?: string
}

export type Gs1Result = { ok: true; data: Gs1Data } | { ok: false; error: string; markup?: string }

const PHRASES: [RegExp, string][] = [
  [/numeric check digit is incorrect/i, 'la cifra di controllo è errata'],
  [/illegal month/i, 'il mese della data non esiste'],
  [/illegal day/i, 'il giorno della data non esiste'],
  [/(?:data|component) is too short/i, 'il valore è troppo corto'],
  [/(?:data|component) is too long/i, 'il valore è troppo lungo'],
  [/illegal character/i, 'contiene un carattere non ammesso'],
  [/non-digit character/i, 'contiene una lettera dove è richiesta una cifra'],
  [/Unrecognised AI|unknown AI/i, 'AI sconosciuto'],
]

export function translateError(message: string): string {
  // In inglese il messaggio originale della GS1 Barcode Syntax Engine è già leggibile.
  if (lang() === 'en') return message
  let m: RegExpMatchArray | null
  if ((m = message.match(/It is invalid to pair AI \((\d+)\) with AI \((\d+)\)/i))) return `Gli AI (${m[1]}) e (${m[2]}) non possono stare insieme.`
  if ((m = message.match(/Required AIs for AI \((\d+)\) are not satisfied: (.+)$/i))) return `L’AI (${m[1]}) richiede anche: ${m[2].trim()}.`
  if ((m = message.match(/^AI \((\d+)\):\s*(.*)$/i))) {
    const p = PHRASES.find(([re]) => re.test(m![2]))
    return `AI (${m[1]}): ${p ? p[1] : m[2]}.`
  }
  const p = PHRASES.find(([re]) => re.test(message))
  return p ? p[1][0].toUpperCase() + p[1].slice(1) + '.' : message
}

const GS = String.fromCharCode(29)

/** true se il testo sembra un dato GS1 leggibile dalla Syntax Engine. */
export function looksLikeGs1(text: string): boolean {
  const s = text.trim()
  return /^\(\d{2,4}\)/.test(s) || /^https?:\/\//i.test(s) || s.startsWith('^') || s.includes(GS) || /^\][A-Za-z]\d/.test(s) || /^\d{8}$|^\d{12,14}$/.test(s)
}

export async function parseGs1(input: string, stem = 'https://id.gs1.org'): Promise<Gs1Result> {
  const engine = await loadSyntaxEngine()
  let s = input.trim().replace(/^\][A-Za-z]\d/, '')
  try {
    if (/^\(\d{2,4}\)/.test(s)) engine.aiDataStr = s
    else if (/^\d{8}$|^\d{12,14}$/.test(s)) engine.aiDataStr = `(01)${s.padStart(14, '0')}`
    else if (/^https?:\/\//i.test(s)) engine.dataStr = s
    else {
      s = s.replaceAll(GS, '^')
      engine.dataStr = s.startsWith('^') ? s : `^${s}`
    }
  } catch (e) {
    return { ok: false, error: translateError(e instanceof Error ? e.message : String(e)), markup: engine.errMarkup || undefined }
  }
  return { ok: true, data: read(engine, stem) }
}

export async function describeAis(ais: Ai[], stem = 'https://id.gs1.org'): Promise<Gs1Result> {
  return parseGs1(ais.map((a) => `(${a.ai})${a.value.replace(/\(/g, '\\(')}`).join(''), stem)
}

function read(engine: Awaited<ReturnType<typeof loadSyntaxEngine>>, stem: string): Gs1Data {
  const hri = engine.hri
  const ais = hri
    .map((line) => line.match(/^\((\d{2,4})\)\s?(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ ai: m[1], value: m[2] }))
  let dl: string | undefined
  try {
    dl = engine.getDLuri(stem)
  } catch {
    dl = undefined
  }
  return {
    ais,
    elementString: ais.map((a) => `(${a.ai})${a.value}`).join(''),
    scanData: engine.dataStr,
    hri,
    dl,
  }
}
