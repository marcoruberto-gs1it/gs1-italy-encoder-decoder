import '../test/setup-fetch'
import { beforeAll, expect, test } from 'vitest'
import { analyzeDecode, analyzeEncode } from './analyze'
import { CARRIERS, loadBwip, renderCarrier } from './barcodes'
import { KEY_TYPES } from './schemes'

beforeAll(() => {
  console.debug = () => {}
})
const params = { filter: 1, hostname: 'id.gs1.org', gcpLength: null }

test('campioni del decoder', async () => {
  for (const s of [
    '3035E85B4837754000003039',
    '0011 0000 0011 0101 1110 1000 0101 1011 0100 1000 0011 0111 0111 0101 0100 0000 0000 0000 0000 0000 0011 0000 0011 1001',
    'F790800123456789705181C883216727D8B9BCF8',
    'FD90800123456789705181CC7419F9B1D3D2E083216727D8B9BCF8',
    'urn:epc:tag:sscc-96:0.8001234.3000000001',
    'https://id.gs1.org/01/08001234567897/10/LOT42/21/ABC123?17=271231',
    '(01)08001234567897(17)271231(10)LOT42(21)12345',
  ]) {
    const a = await analyzeDecode(s, params)
    expect(a.error, s).toBeUndefined()
    expect(a.results.some((r) => r.ok), s).toBe(true)
  }
})

test('encoder: tutti i tipi di chiave e i barcode', async () => {
  const lib = await loadBwip()
  for (const k of KEY_TYPES) {
    const a = await analyzeEncode(k.example, { ...params, filter: 0 })
    expect(a.error, k.id).toBeUndefined()
    expect(a.rfidNote, k.id).toBeUndefined()
    const rendered = CARRIERS.map((c) => [c.id, renderCarrier(lib, c, a.gs1!)] as const)
    for (const [id, r] of rendered) if (r && 'error' in r && id !== 'databar') throw new Error(`${k.id} ${id}: ${r.error}`)
  }
  const g = await analyzeEncode([{ ai: '01', value: '08001234567897' }], params)
  expect(g.rfidNote).toMatch(/numero di serie/)
  expect(renderCarrier(lib, CARRIERS[0], g.gs1!)).toHaveProperty('svg')
})

test('GCP: da Verified by GS1, altrimenti scelto dall’utente', async () => {
  const ais = [{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }]
  const none = await analyzeEncode(ais, params)
  expect(none.gcp).toEqual({ length: null, source: null, pending: false })
  const r96 = none.results.find((r) => r.scheme === 'SGTIN-96')!
  expect(!r96.ok && r96.error).toMatch(/Scegli la lunghezza/)
  expect(none.results.find((r) => r.scheme === 'SGTIN+')!.ok).toBe(true)

  const vbg = await analyzeEncode(ais, { ...params, gcpLength: 9 }, { prefix: '8001234', pending: false })
  expect(vbg.gcp).toMatchObject({ length: 7, source: 'Verified by GS1' })
  expect(vbg.results.find((r) => r.scheme === 'SGTIN-96')!.ok).toBe(true)

  const user = await analyzeEncode(ais, { ...params, gcpLength: 7 })
  expect(user.gcp).toMatchObject({ length: 7, source: 'utente' })

  const pending = await analyzeEncode(ais, params, { pending: true })
  const p96 = pending.results.find((r) => r.scheme === 'SGTIN-96')!
  expect(!p96.ok && p96.error).toMatch(/In attesa/)
})

test('EPC in binario: stesso risultato dell’esadecimale', async () => {
  const bin = await analyzeDecode('0011 0000 0011 0101 1110 1000 0101 1011 0100 1000 0011 0111 0111 0101 0100 0000 0000 0000 0000 0000 0011 0000 0011 1001', params)
  expect(bin.detected).toBe('EPC binario · SGTIN-96')
  expect(bin.ais).toEqual([{ ai: '01', value: '08001234567897' }, { ai: '21', value: '12345' }])
  const r = bin.results.find((x) => x.scheme === 'SGTIN-96')
  expect(r?.ok && r.hex).toBe('3035E85B4837754000003039')
})
