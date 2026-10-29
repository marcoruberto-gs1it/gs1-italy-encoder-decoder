import { expect, test } from 'vitest'
import { crc16, epcBank, pcWord } from './rfid'

const toBits = (s: string) => [...s].map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join('')

test('CRC-16 Gen2 (CRC-16/GENIBUS) sul vettore di prova', () => {
  expect(crc16(toBits('123456789')).toString(16)).toBe('d64e')
})

test('PC word per un EPC a 96 bit', () => {
  expect(pcWord(96).bits).toBe('0011000000000000') // 3000h
  expect(epcBank('0'.repeat(96)).words).toHaveLength(8)
})
