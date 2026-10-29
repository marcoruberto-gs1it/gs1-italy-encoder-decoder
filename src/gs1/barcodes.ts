/*
 * Data carrier GS1 disegnati con bwip-js (Barcode Writer in Pure JavaScript, MIT), che applica
 * anche il controllo dei dati GS1 (gs1lint) prima di generare il simbolo.
 */
type Bwip = typeof import('bwip-js/browser')

let bwip: Promise<Bwip> | null = null
/** bwip-js è grande: si carica solo quando servono i simboli. */
export const loadBwip = () => (bwip ??= import('bwip-js/browser'))
import type { Gs1Data } from './syntax'
import { t } from '../i18n'

export type Carrier = {
  id: string
  name: string
  /** Simbologia bwip-js */
  bcid: string
  /** Identificatore di simbologia trasmesso dal lettore (ISO/IEC 15424). */
  symbologyId: string
  when: string
  dl?: boolean
  text: (d: Gs1Data) => string | null
  options?: Record<string, unknown>
}

const gtin13 = (d: Gs1Data) => {
  if (d.ais.length !== 1 || d.ais[0].ai !== '01' || !d.ais[0].value.startsWith('0')) return null
  return d.ais[0].value.slice(1)
}

export const CARRIERS: Carrier[] = [
  {
    id: 'ean13',
    name: 'EAN-13',
    bcid: 'ean13',
    symbologyId: ']E0',
    get when() { return t('Il barcode del punto cassa: contiene solo il GTIN-13, niente seriale, lotto o scadenza.') },
    text: gtin13,
    options: { includetext: true, textxalign: 'center', height: 18 },
  },
  {
    id: 'gs1-128',
    name: 'GS1-128',
    bcid: 'gs1-128',
    symbologyId: ']C1',
    get when() { return t('Etichette logistiche e imballi: lineare, fino a 48 caratteri di dati.') },
    text: (d) => d.elementString,
    options: { includetext: true, height: 14 },
  },
  {
    id: 'databar',
    name: 'GS1 DataBar Expanded',
    bcid: 'databarexpandedstacked',
    symbologyId: ']e0',
    get when() { return t('Freschi a peso variabile e coupon: lineare compatto, leggibile alle casse.') },
    text: (d) => d.elementString,
    options: { segments: 4 },
  },
  {
    id: 'gs1datamatrix',
    name: 'GS1 DataMatrix',
    bcid: 'gs1datamatrix',
    symbologyId: ']d2',
    get when() { return t('Sanità, marcatura diretta e prodotti regolamentati: element string GS1 compatta.') },
    text: (d) => d.elementString,
  },
  {
    id: 'gs1qrcode',
    name: 'GS1 QR Code',
    bcid: 'gs1qrcode',
    symbologyId: ']Q3',
    get when() { return t('QR Code con element string GS1 per usi industriali (non apre un sito).') },
    text: (d) => d.elementString,
  },
  {
    id: 'dlqr',
    get name() { return t('QR Code con GS1 Digital Link') },
    bcid: 'gs1dlqrcode',
    symbologyId: ']Q1',
    get when() { return t('Il QR “Sunrise 2027”: alla cassa vale come barcode, con lo smartphone apre le informazioni del prodotto.') },
    dl: true,
    text: (d) => d.dl ?? null,
  },
  {
    id: 'dldm',
    get name() { return t('DataMatrix con GS1 Digital Link') },
    bcid: 'gs1dldatamatrix',
    symbologyId: ']d1',
    get when() { return t('Digital Link in un DataMatrix: stessa funzione del QR, simbolo più piccolo.') },
    dl: true,
    text: (d) => d.dl ?? null,
  },
]

export type Rendered = { svg: string } | { error: string } | null

export function renderCarrier(lib: Bwip, c: Carrier, d: Gs1Data): Rendered {
  const text = c.text(d)
  if (!text) return null
  try {
    return { svg: lib.toSVG({ bcid: c.bcid, text, scale: 3, paddingwidth: 4, paddingheight: 4, ...c.options }) }
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).replace(/^bwipp\.\w+#?\d*:\s*/i, '')
    return { error: msg }
  }
}
