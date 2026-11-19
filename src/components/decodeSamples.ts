import { t } from '../i18n'

export type SampleKind = 'rfid' | 'web' | 'gs1'

/** Formati che il decoder riconosce, ognuno con una spiegazione semplice e un esempio reale da caricare. */
export const DECODE_SAMPLES: { label: string; detail: string; text: string; kind: SampleKind }[] = [
  { get label() { return t('EPC (esadecimale)') }, get detail() { return t('Il codice letto da un tag RFID, come lo mostra il lettore') }, text: '3035E8480000004000003039', kind: 'rfid' },
  { get label() { return t('EPC (binario)') }, get detail() { return t('Gli stessi bit in 0 e 1, anche a gruppi separati da spazi') }, text: '0011 0000 0011 0101 1110 1000 0100 1000 0000 0000 0000 0000 0000 0000 0100 0000 0000 0000 0000 0000 0011 0000 0011 1001', kind: 'rfid' },
  { get label() { return t('EPC con lotto e scadenza') }, get detail() { return t('Un tag SGTIN+ (TDS 2.x) che porta anche altri dati GS1') }, text: 'F790800000000001905181C883296727C6C2E6F3E000', kind: 'rfid' },
  { label: 'EPC URI', get detail() { return t('L’EPC in testo: urn:epc:tag:… oppure urn:epc:id:…') }, text: 'urn:epc:tag:sscc-96:0.8000000.3000000001', kind: 'rfid' },
  { label: 'GS1 Digital Link', get detail() { return t('Il link web di un QR code GS1, anche con dati dopo il ?') }, text: 'https://id.gs1.org/01/08000000000019/10/LOT42/21/ABC123?17=271231', kind: 'web' },
  { label: 'Element string', get detail() { return t('I dati GS1 con gli AI tra parentesi, come sotto un barcode') }, text: '(01)08000000000019(17)271231(10)LOT42(21)12345', kind: 'gs1' },
  { get label() { return t('Dati del lettore') }, get detail() { return t('Quello che trasmette un lettore di barcode, con il prefisso ]C1, ]d2 o ]Q3') }, text: ']C1010800000000001917271231', kind: 'gs1' },
  { label: 'GTIN', get detail() { return t('Solo il numero del prodotto: 8, 12, 13 o 14 cifre') }, text: '8000000000019', kind: 'gs1' },
]
