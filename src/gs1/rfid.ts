/*
 * Memoria EPC (MB01) di un tag UHF RAIN RFID (ISO/IEC 18000-63, GS1 EPC UHF Gen2 Air Interface):
 * StoredCRC (00h–0Fh), Protocol Control (10h–1Fh), poi l'EPC da 20h.
 */
import { t } from '../i18n'

/** CRC-16 di Gen2 (polinomio 0x1021, valore iniziale 0xFFFF, complemento finale). */
export function crc16(bits: string): number {
  let crc = 0xffff
  for (const b of bits) {
    const top = (crc >> 15) & 1
    crc = (crc << 1) & 0xffff
    if (top ^ Number(b)) crc ^= 0x1021
  }
  return ~crc & 0xffff
}

export type PcWord = {
  bits: string
  lengthWords: number
  fields: { label: string; bits: string; note: string }[]
}

/** Protocol Control word: lunghezza EPC in parole, UMI, XI, toggle di numerazione (0 = EPC GS1), bit di attributo. */
export function pcWord(epcBits: number, userMemory = false): PcWord {
  const lengthWords = Math.ceil(epcBits / 16)
  const len = lengthWords.toString(2).padStart(5, '0')
  const umi = userMemory ? '1' : '0'
  const fields = [
    { label: t('Lunghezza'), bits: len, note: t('L’EPC occupa {words} parole da 16 bit ({bits} bit).', { words: lengthWords, bits: lengthWords * 16 }) },
    { label: 'UMI', bits: umi, note: userMemory ? t('La User Memory contiene dati.') : t('User Memory vuota o assente.') },
    { label: 'XI', bits: '0', note: t('Nessuna XPC word (Extended Protocol Control).') },
    { label: 'T', bits: '0', note: t('Toggle 0: la memoria contiene un EPC secondo il GS1 EPC Tag Data Standard.') },
    { label: t('Attributi'), bits: '00000000', note: t('Bit di attributo (18h–1Fh), qui a zero.') },
  ]
  return { bits: fields.map((f) => f.bits).join(''), lengthWords, fields }
}

export type EpcBank = { crc: string; pc: PcWord; epc: string; words: string[] }

/** Contenuto completo del banco EPC per un EPC già completato a 16 bit. */
export function epcBank(epcBits: string): EpcBank {
  const pc = pcWord(epcBits.length)
  const crc = crc16(pc.bits + epcBits).toString(2).padStart(16, '0')
  const all = crc + pc.bits + epcBits
  const words: string[] = []
  for (let i = 0; i < all.length; i += 16) words.push(all.slice(i, i + 16))
  return { crc, pc, epc: epcBits, words }
}

export const hexWord = (bits: string) => parseInt(bits, 2).toString(16).toUpperCase().padStart(4, '0')
