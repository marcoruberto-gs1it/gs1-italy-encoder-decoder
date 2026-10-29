/*
 * Chiavi GS1 e schemi EPC del GS1 EPC Tag Data Standard (TDS) 2.3: nomi, campi del modulo,
 * filter value e spiegazioni mostrate nell'interfaccia.
 */

import { k, t } from '../i18n'

export type Ai = { ai: string; value: string }

export type KeyField = {
  ai: string
  label: string
  hint: string
  placeholder: string
  /** Il valore termina con una cifra di controllo GS1 (posizione dalla fine del valore numerico iniziale). */
  checkDigitLength?: number
  optional?: boolean
}

export type KeyType = {
  id: string
  name: string
  short: string
  description: string
  fields: KeyField[]
  example: Ai[]
}

export const KEY_TYPES: KeyType[] = [
  {
    id: 'sgtin',
    get name() { return t('GTIN + numero di serie') },
    short: 'SGTIN',
    get description() { return t('Il singolo esemplare di un prodotto: GTIN (AI 01) più numero di serie (AI 21).') },
    fields: [
      { ai: '01', label: 'GTIN', get hint() { return t('8, 12, 13 o 14 cifre: viene portato a 14 con zeri iniziali') }, placeholder: '08000000000019', checkDigitLength: 14 },
      { ai: '21', get label() { return t('Numero di serie') }, get hint() { return t('Fino a 20 caratteri alfanumerici GS1') }, placeholder: '12345' },
    ],
    example: [
      { ai: '01', value: '08000000000019' },
      { ai: '21', value: '12345' },
    ],
  },
  {
    id: 'sscc',
    name: 'SSCC',
    short: 'SSCC',
    get description() { return t('Unità logistica (pallet, collo): Serial Shipping Container Code, AI 00.') },
    fields: [{ ai: '00', label: 'SSCC', get hint() { return t('18 cifre: estensione + GS1 Company Prefix + riferimento seriale + cifra di controllo') }, placeholder: '380000000000000010', checkDigitLength: 18 }],
    example: [{ ai: '00', value: '380000000000000010' }],
  },
  {
    id: 'sgln',
    get name() { return t('GLN + estensione') },
    short: 'SGLN',
    get description() { return t('Una località fisica: GLN (AI 414) con eventuale estensione (AI 254).') },
    fields: [
      { ai: '414', label: 'GLN', get hint() { return t('13 cifre') }, placeholder: '8000000000002', checkDigitLength: 13 },
      { ai: '254', get label() { return t('Estensione') }, get hint() { return t('Facoltativa: se manca si usa 0 (nessuna estensione)') }, placeholder: '12', optional: true },
    ],
    example: [
      { ai: '414', value: '8000000000002' },
      { ai: '254', value: '12' },
    ],
  },
  {
    id: 'grai',
    name: 'GRAI',
    short: 'GRAI',
    get description() { return t('Bene riutilizzabile (cassa, pallet a rendere): AI 8003 = 0 + GRAI di 13 cifre + seriale.') },
    fields: [{ ai: '8003', label: 'GRAI (AI 8003)', get hint() { return t('0 + 13 cifre con cifra di controllo + seriale facoltativo (max 16)') }, placeholder: '080000000000191234' }],
    example: [{ ai: '8003', value: '080000000000191234' }],
  },
  {
    id: 'giai',
    name: 'GIAI',
    short: 'GIAI',
    get description() { return t('Bene strumentale individuale (attrezzatura, arredo): AI 8004.') },
    fields: [{ ai: '8004', label: 'GIAI (AI 8004)', get hint() { return t('GS1 Company Prefix + riferimento del bene, max 30 caratteri') }, placeholder: '8000000ASSET-42' }],
    example: [{ ai: '8004', value: '80000000042' }],
  },
  {
    id: 'gsrn',
    get name() { return t('GSRN (fornitore)') },
    short: 'GSRN',
    get description() { return t('Relazione di servizio, lato fornitore: AI 8018.') },
    fields: [{ ai: '8018', label: 'GSRN', get hint() { return t('18 cifre') }, placeholder: '800000000000000013', checkDigitLength: 18 }],
    example: [{ ai: '8018', value: '800000000000000013' }],
  },
  {
    id: 'gsrnp',
    get name() { return t('GSRN (destinatario)') },
    short: 'GSRNP',
    get description() { return t('Relazione di servizio, lato destinatario del servizio: AI 8017.') },
    fields: [{ ai: '8017', label: 'GSRN', get hint() { return t('18 cifre') }, placeholder: '800000000000000013', checkDigitLength: 18 }],
    example: [{ ai: '8017', value: '800000000000000013' }],
  },
  {
    id: 'gdti',
    name: 'GDTI',
    short: 'GDTI',
    get description() { return t('Documento: AI 253 = 13 cifre con cifra di controllo + seriale facoltativo.') },
    fields: [{ ai: '253', label: 'GDTI (AI 253)', get hint() { return t('13 cifre + seriale facoltativo (max 17)') }, placeholder: '80000000000196789', checkDigitLength: 13 }],
    example: [{ ai: '253', value: '80000000000196789' }],
  },
  {
    id: 'sgcn',
    name: 'GCN',
    short: 'SGCN',
    get description() { return t('Coupon: AI 255 = 13 cifre con cifra di controllo + seriale facoltativo.') },
    fields: [{ ai: '255', label: 'GCN (AI 255)', get hint() { return t('13 cifre + seriale facoltativo (max 12 cifre)') }, placeholder: '800000000001942', checkDigitLength: 13 }],
    example: [{ ai: '255', value: '800000000001942' }],
  },
  {
    id: 'cpi',
    get name() { return t('CPI + seriale') },
    short: 'CPI',
    get description() { return t('Componente o parte: CPI (AI 8010) più numero di serie (AI 8011).') },
    fields: [
      { ai: '8010', label: 'CPI (AI 8010)', get hint() { return t('GS1 Company Prefix + riferimento, max 30 caratteri') }, placeholder: '8000000PART-7' },
      { ai: '8011', get label() { return t('Seriale CPI (AI 8011)') }, get hint() { return t('Fino a 12 cifre') }, placeholder: '42' },
    ],
    example: [
      { ai: '8010', value: '800000012345' },
      { ai: '8011', value: '42' },
    ],
  },
  {
    id: 'itip',
    get name() { return t('ITIP + seriale') },
    short: 'ITIP',
    get description() { return t('Parte di un articolo spedito in più colli: ITIP (AI 8006) più numero di serie (AI 21).') },
    fields: [
      { ai: '8006', label: 'ITIP (AI 8006)', get hint() { return t('18 cifre: GTIN-14 + pezzo (2) + totale pezzi (2)') }, placeholder: '080000000000190102', checkDigitLength: 14 },
      { ai: '21', get label() { return t('Numero di serie') }, get hint() { return t('Fino a 20 caratteri') }, placeholder: '12345' },
    ],
    example: [
      { ai: '8006', value: '080000000000190102' },
      { ai: '21', value: '12345' },
    ],
  },
]

export const keyType = (id: string) => KEY_TYPES.find((k) => k.id === id)

/** AI primario della chiave → tipo di chiave. */
export function keyTypeForAis(ais: Ai[]): KeyType | undefined {
  const has = (ai: string) => ais.some((a) => a.ai === ai)
  if (has('01')) return keyType('sgtin')
  if (has('8006')) return keyType('itip')
  return KEY_TYPES.find((k) => has(k.fields[0].ai))
}

/** Famiglia di uno schema: SGTIN-96, SGTIN+, DSGTIN++ → sgtin. */
export const familyOf = (scheme: string) => scheme.replace(/^DSGTIN/, 'SGTIN').replace(/[-+].*$/, '').toLowerCase()

export type SchemeKind = 'legacy' | 'plus' | 'plusplus'
export const kindOf = (scheme: string): SchemeKind => (scheme.endsWith('++') ? 'plusplus' : scheme.endsWith('+') ? 'plus' : 'legacy')

export const KIND_INFO: Record<SchemeKind, { label: string; text: string }> = {
  legacy: {
    label: 'TDS 1.x',
    get text() { return t('Schema “classico” a lunghezza fissa: serve conoscere la lunghezza del GS1 Company Prefix (tabella di partizione) e non porta dati aggiuntivi.') },
  },
  plus: {
    label: 'TDS 2.x  +',
    get text() { return t('Schema basato sugli AI: codifica direttamente i valori GS1 senza partizione e può aggiungere altri AI (+AIDC) come lotto o scadenza.') },
  },
  plusplus: {
    label: 'TDS 2.3  ++',
    get text() { return t('Come lo schema +, con in più il dominio (hostname) compresso nel tag: il tag ricostruisce da solo il GS1 Digital Link del brand.') },
  },
}

/** Data prioritaria degli schemi DSGTIN+ / DSGTIN++ (TDS 2.x, indicatore a 4 bit). */
export const DATE_TYPES: { code: string; ai: string; label: string }[] = [
  { code: '0000', ai: '11', get label() { return t('Data di produzione') } },
  { code: '0001', ai: '13', get label() { return t('Data di confezionamento') } },
  { code: '0010', ai: '15', get label() { return t('Da consumarsi preferibilmente entro') } },
  { code: '0011', ai: '16', get label() { return t('Data limite di vendita') } },
  { code: '0100', ai: '17', get label() { return t('Data di scadenza') } },
  { code: '0101', ai: '7006', get label() { return t('Data del primo congelamento') } },
  { code: '0110', ai: '7007', get label() { return t('Data di raccolta') } },
]

/** Filter value degli schemi SGTIN (TDS, tabella dei filter value SGTIN). */
const SGTIN_FILTERS = [
  k('Tutti gli altri'),
  k('Articolo per il punto vendita (POS)'),
  k('Imballo completo per il trasporto'),
  k('Riservato'),
  k('Imballo interno per la movimentazione'),
  k('Riservato'),
  k('Unità di carico'),
  k('Unità contenuta in un articolo o componente non destinato alla vendita singola'),
]

export function filterOptions(family: string): { value: number; label: string }[] {
  if (family === 'sgtin') return SGTIN_FILTERS.map((label, value) => ({ value, label: `${value} · ${t(label)}` }))
  return Array.from({ length: 8 }, (_, value) => ({
    value,
    label: value === 0 ? `0 · ${t('Tutti gli altri')}` : `${value} · ${t('(vedi TDS §10 per {key})', { key: family.toUpperCase() })}`,
  }))
}

export const filterMeaning = (family: string, value: number) =>
  family === 'sgtin' ? t(SGTIN_FILTERS[value]) : value === 0 ? t('Tutti gli altri') : t('Valore {value}: vedi le tabelle dei filter value del TDS', { value })

/** Nomi dei campi delle grammatiche TDT (da tradurre con t() al momento dell'uso). */
export const FIELD_LABELS: Record<string, string> = {
  gs1companyprefix: k('GS1 Company Prefix'),
  itemref: k('Indicatore + Item Reference'),
  serial: k('Numero di serie'),
  serialref: k('Estensione + riferimento seriale'),
  locationref: k('Riferimento località'),
  assettype: k('Tipo di bene'),
  indassetref: k('Riferimento del bene'),
  serviceref: k('Riferimento del servizio'),
  doctype: k('Tipo di documento'),
  couponref: k('Riferimento coupon'),
  prependedserial: k('Seriale (con prefisso)'),
  comppartref: k('Riferimento componente'),
  cpiserial: k('Seriale CPI'),
  piece: k('Numero del pezzo'),
  total: k('Totale pezzi'),
  generalmanager: k('General Manager Number'),
  objectclass: k('Object Class'),
  cage: k('Codice CAGE'),
  cageordodaac: 'CAGE / DoDAAC',
}

/** Schemi EPC di ogni chiave, nell'ordine di schemesForFamily (verificato in epc.test.ts sugli artefatti TDT). */
export const SCHEMES_BY_FAMILY: Record<string, string[]> = {
  sgtin: ['SGTIN-96', 'SGTIN-198', 'SGTIN+', 'DSGTIN+', 'SGTIN++', 'DSGTIN++'],
  sscc: ['SSCC-96', 'SSCC+', 'SSCC++'],
  sgln: ['SGLN-96', 'SGLN-195', 'SGLN+', 'SGLN++'],
  grai: ['GRAI-96', 'GRAI-170', 'GRAI+', 'GRAI++'],
  giai: ['GIAI-96', 'GIAI-202', 'GIAI+', 'GIAI++'],
  gsrn: ['GSRN-96', 'GSRN+', 'GSRN++'],
  gsrnp: ['GSRNP-96', 'GSRNP+', 'GSRNP++'],
  gdti: ['GDTI-96', 'GDTI-113', 'GDTI-174', 'GDTI+', 'GDTI++'],
  sgcn: ['SGCN-96', 'SGCN+', 'SGCN++'],
  cpi: ['CPI-96', 'CPI-var', 'CPI+', 'CPI++'],
  itip: ['ITIP-110', 'ITIP-212', 'ITIP+', 'ITIP++'],
}
