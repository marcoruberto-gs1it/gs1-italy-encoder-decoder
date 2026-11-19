/*
 * Valori degli AI resi leggibili per chi non conosce il formato: date per esteso, pesi con l'unità.
 * Restituisce undefined quando il valore si legge già così com'è.
 */
import { locale, t } from '../i18n'

/** Anno a due cifre secondo le GS1 General Specifications (finestra mobile di ±50 anni). */
function fullYear(yy: number, now = new Date().getFullYear()): number {
  const century = Math.floor(now / 100) * 100
  const diff = yy - (now % 100)
  return diff >= 51 ? century - 100 + yy : diff <= -50 ? century + 100 + yy : century + yy
}

/** Data AAMMGG; il giorno 00 vale "fine mese". */
function date6(v: string): string | undefined {
  if (!/^\d{6}$/.test(v)) return undefined
  const y = fullYear(Number(v.slice(0, 2)))
  const m = Number(v.slice(2, 4))
  const d = Number(v.slice(4, 6))
  if (m < 1 || m > 12) return undefined
  if (d === 0) return t('fine {month}', { month: new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1)) })
  const date = new Date(y, m - 1, d)
  if (date.getMonth() !== m - 1) return undefined
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

const DATE_AIS = ['11', '12', '13', '15', '16', '17', '7006']

export function humanValue(ai: string, value: string): string | undefined {
  if (DATE_AIS.includes(ai)) return date6(value)
  if (ai === '7007') {
    const from = date6(value.slice(0, 6))
    const to = value.length === 12 ? date6(value.slice(6)) : undefined
    return from && to ? `${from} – ${to}` : from
  }
  if (ai === '7003' && /^\d{10}$/.test(value)) {
    const d = date6(value.slice(0, 6))
    return d ? `${d}, ${value.slice(6, 8)}:${value.slice(8, 10)}` : undefined
  }
  // Pesi e misure 3nnn: l'ultima cifra dell'AI dice quanti decimali ha il valore.
  const m = ai.match(/^3(1|2)0(\d)$/)
  if (m && /^\d{6}$/.test(value)) {
    const n = Number(value) / 10 ** Number(m[2])
    const unit = m[1] === '1' ? 'kg' : 'lb'
    return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 6 }).format(n)} ${unit}`
  }
  return undefined
}
